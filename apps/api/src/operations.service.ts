import { randomUUID } from 'node:crypto';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { authorize } from '@company-os/authorization';
import type {
  AllocateCostInput,
  ApplyReceiptInput,
  CreateRequisitionInput,
  DecideAttendanceInput,
  ListAttendancePeriodsQuery,
  ListAttendanceQuery,
  PostJournalInput,
  RecordAttendanceInput,
  RequestLeaveInput,
  RequestContext,
  TransitionAttendancePeriodInput,
} from '@company-os/contracts';
import { entityId, tenantId } from '@company-os/kernel';
import {
  AttendanceEntry,
  AttendancePeriodTransition,
  AttendanceReview,
} from '@company-os/workforce';
import type { PoolClient } from 'pg';
import { createDatabasePool } from './database-pool.js';
import { AccessDeniedError } from './organization.service.js';

type CommandResult = Readonly<{ id: string; version: number }>;
export class OperationConflictError extends Error {}
export class AttendanceConflictError extends Error {}

@Injectable()
export class OperationsService implements OnApplicationShutdown {
  private readonly pool = createDatabasePool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
  });

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  async recordAttendance(
    input: RecordAttendanceInput,
    context: RequestContext,
  ): Promise<CommandResult> {
    this.assertAuthorized('workforce.attendance.record', input.tenantId, context);
    const entry = new AttendanceEntry({
      workDate: input.workDate,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      timeZone: input.timeZone,
      breaks: input.breaks,
    });
    try {
      return await this.transaction(context, async (client) => {
        await this.assertEmploymentAccess(client, context, input.employmentId);
        if (input.correctedEntryId !== undefined) {
          const correction = await client.query(
            `SELECT 1 FROM workforce.attendance_entries original
            WHERE original.tenant_id=$1 AND original.id=$2 AND original.employment_id=$3
              AND NOT EXISTS (
                SELECT 1 FROM workforce.attendance_entries replacement
                 WHERE replacement.tenant_id=original.tenant_id
                   AND replacement.corrected_entry_id=original.id
              ) FOR UPDATE`,
            [input.tenantId, input.correctedEntryId, input.employmentId],
          );
          if (correction.rowCount !== 1)
            throw new OperationConflictError('Attendance correction target is unavailable');
        }
        await client.query(
          `INSERT INTO workforce.attendance_entries
          (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,
           recorded_by,corrected_entry_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$9,$10)`,
          [
            input.tenantId,
            input.id,
            input.employmentId,
            input.workDate,
            input.startedAt,
            input.endedAt,
            entry.breakMinutes,
            input.source,
            context.actorId,
            input.correctedEntryId ?? null,
          ],
        );
        for (const item of input.breaks) {
          await client.query(
            `INSERT INTO workforce.attendance_breaks
            (tenant_id,attendance_entry_id,id,started_at,ended_at)
           VALUES ($1,$2,$3,$4,$5)`,
            [input.tenantId, input.id, item.id, item.startedAt, item.endedAt],
          );
        }
        await this.recordEvidence(
          client,
          context,
          'workforce.attendance.record',
          'attendance',
          input.id,
          {
            workDate: input.workDate,
            workedMinutes: entry.workedMinutes,
            breakCount: input.breaks.length,
            correctedEntryId: input.correctedEntryId,
          },
        );
        return { id: input.id, version: 1 };
      });
    } catch (error) {
      this.rethrowAttendanceConflict(error);
    }
  }

  async listAttendance(
    query: ListAttendanceQuery,
    context: RequestContext,
  ): Promise<readonly Record<string, unknown>[]> {
    this.assertAuthorized('workforce.attendance.read', context.tenantId, context);
    return this.transaction(context, async (client) => {
      await this.assertEmploymentAccess(client, context, query.employmentId);
      const result = await client.query(
        `SELECT entry.id,to_char(entry.work_date,'YYYY-MM-DD') AS "workDate",
                entry.started_at AS "startedAt",
                entry.ended_at AS "endedAt",entry.break_minutes AS "breakMinutes",
                (extract(epoch FROM (entry.ended_at-entry.started_at))/60-entry.break_minutes)::integer
                  AS "workedMinutes",
                entry.source,entry.status,entry.corrected_entry_id AS "correctedEntryId",
                replacement.id AS "supersededById",
                decision.decision,decision.reason AS "decisionReason",
                decision.decided_at AS "decidedAt",decision.decided_by AS "decidedBy",
                workforce.attendance_period_is_closed(
                  entry.tenant_id,entry.employment_id,entry.work_date) AS "periodClosed",
                coalesce(jsonb_agg(jsonb_build_object(
                  'id',br.id,'startedAt',br.started_at,'endedAt',br.ended_at)
                  ORDER BY br.started_at) FILTER (WHERE br.id IS NOT NULL),'[]'::jsonb) AS breaks
           FROM workforce.attendance_entries entry
           LEFT JOIN workforce.attendance_breaks br
             ON br.tenant_id=entry.tenant_id AND br.attendance_entry_id=entry.id
           LEFT JOIN workforce.attendance_entries replacement
             ON replacement.tenant_id=entry.tenant_id AND replacement.corrected_entry_id=entry.id
           LEFT JOIN workforce.attendance_decisions decision
             ON decision.tenant_id=entry.tenant_id AND decision.attendance_entry_id=entry.id
          WHERE entry.tenant_id=$1 AND entry.employment_id=$2
          GROUP BY entry.tenant_id,entry.id,replacement.id,decision.tenant_id,decision.id
          ORDER BY entry.work_date DESC,entry.started_at DESC,entry.id DESC LIMIT $3`,
        [context.tenantId, query.employmentId, query.limit],
      );
      return result.rows as readonly Record<string, unknown>[];
    });
  }

  async decideAttendance(
    input: DecideAttendanceInput,
    context: RequestContext,
  ): Promise<CommandResult> {
    this.assertAuthorized('workforce.attendance.review', input.tenantId, context);
    const review = new AttendanceReview(input.decision, input.reason);
    try {
      return await this.transaction(context, async (client) => {
        await this.assertEmploymentAccess(client, context, input.employmentId, ['manager', 'hr']);
        await client.query(
          `INSERT INTO workforce.attendance_decisions
            (tenant_id,id,attendance_entry_id,employment_id,decision,reason,decided_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            input.tenantId,
            input.id,
            input.attendanceEntryId,
            input.employmentId,
            review.decision,
            review.reason,
            context.actorId,
          ],
        );
        await this.recordEvidence(
          client,
          context,
          'workforce.attendance.review',
          'attendance_decision',
          input.id,
          {
            attendanceEntryId: input.attendanceEntryId,
            decision: review.decision,
            reason: review.reason,
          },
          `attendance.${review.decision}.v1`,
        );
        return { id: input.id, version: 1 };
      });
    } catch (error) {
      this.rethrowAttendanceConflict(error);
    }
  }

  async transitionAttendancePeriod(
    input: TransitionAttendancePeriodInput,
    context: RequestContext,
  ): Promise<CommandResult> {
    this.assertAuthorized('workforce.attendance.period.manage', input.tenantId, context);
    const transition = new AttendancePeriodTransition(
      input.periodMonth,
      input.action,
      input.reason,
    );
    try {
      return await this.transaction(context, async (client) => {
        await this.assertEmploymentAccess(client, context, input.employmentId, ['hr']);
        await client.query(
          `INSERT INTO workforce.attendance_period_events
            (tenant_id,id,employment_id,period_month,sequence,action,reason,actor_id)
           VALUES ($1,$2,$3,$4,1,$5,$6,$7)`,
          [
            input.tenantId,
            input.id,
            input.employmentId,
            transition.periodMonth,
            transition.action,
            transition.reason,
            context.actorId,
          ],
        );
        await this.recordEvidence(
          client,
          context,
          'workforce.attendance.period.manage',
          'attendance_period_event',
          input.id,
          {
            employmentId: input.employmentId,
            periodMonth: transition.periodMonth,
            action: transition.action,
            reason: transition.reason,
          },
          `attendance_period.${transition.action === 'close' ? 'closed' : 'reopened'}.v1`,
        );
        return { id: input.id, version: 1 };
      });
    } catch (error) {
      this.rethrowAttendanceConflict(error);
    }
  }

  async listAttendancePeriods(
    query: ListAttendancePeriodsQuery,
    context: RequestContext,
  ): Promise<readonly Record<string, unknown>[]> {
    this.assertAuthorized('workforce.attendance.period.manage', context.tenantId, context);
    return this.transaction(context, async (client) => {
      await this.assertEmploymentAccess(client, context, query.employmentId, ['hr']);
      const result = await client.query(
        `SELECT id,to_char(period_month,'YYYY-MM-DD') AS "periodMonth",sequence,action,reason,
                occurred_at AS "occurredAt",actor_id AS "actorId"
           FROM workforce.attendance_period_events
          WHERE tenant_id=$1 AND employment_id=$2
          ORDER BY period_month DESC,sequence DESC LIMIT $3`,
        [context.tenantId, query.employmentId, query.limit],
      );
      return result.rows as readonly Record<string, unknown>[];
    });
  }

  async requestLeave(input: RequestLeaveInput, context: RequestContext): Promise<CommandResult> {
    this.assertAuthorized('workforce.leave.request', input.tenantId, context);
    return this.transaction(context, async (client) => {
      await this.assertEmploymentAccess(client, context, input.employmentId);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${input.tenantId}:${input.employmentId}:leave`,
      ]);
      const balance = await client.query<{ available: string }>(
        `SELECT coalesce(sum(minutes),0)::text AS available
           FROM workforce.leave_ledger
          WHERE tenant_id=$1 AND employment_id=$2`,
        [input.tenantId, input.employmentId],
      );
      if (Number(balance.rows[0]?.available ?? '0') < input.requestedMinutes)
        throw new OperationConflictError('Insufficient leave balance');
      await client.query(
        `INSERT INTO workforce.leave_requests
          (tenant_id,id,employment_id,leave_type,starts_on,ends_on,requested_minutes,status,requested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
        [
          input.tenantId,
          input.id,
          input.employmentId,
          input.leaveType,
          input.startsOn,
          input.endsOn,
          input.requestedMinutes,
          context.actorId,
        ],
      );
      await client.query(
        `INSERT INTO workforce.leave_ledger
          (tenant_id,id,employment_id,occurred_at,entry_type,minutes,reference_id)
         VALUES ($1,$2,$3,clock_timestamp(),'reserve',$4,$5)`,
        [input.tenantId, randomUUID(), input.employmentId, -input.requestedMinutes, input.id],
      );
      await this.recordEvidence(
        client,
        context,
        'workforce.leave.request',
        'leave_request',
        input.id,
        {
          requestedMinutes: input.requestedMinutes,
        },
      );
      return { id: input.id, version: 1 };
    });
  }

  async createRequisition(
    input: CreateRequisitionInput,
    context: RequestContext,
  ): Promise<CommandResult> {
    this.assertAuthorized('procurement.requisition.create', input.tenantId, context);
    return this.transaction(context, async (client) => {
      await client.query(
        `INSERT INTO procurement.requisitions
          (tenant_id,id,requester_id,organization_unit_id,currency,purpose,status,version)
         VALUES ($1,$2,$3,$4,$5,$6,'submitted',1)`,
        [
          input.tenantId,
          input.id,
          context.actorId,
          input.organizationUnitId,
          input.currency,
          input.purpose,
        ],
      );
      for (const line of input.lines) {
        await client.query(
          `INSERT INTO procurement.requisition_lines
            (tenant_id,requisition_id,id,description,quantity,estimated_unit_price)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            input.tenantId,
            input.id,
            line.id,
            line.description,
            line.quantity,
            line.estimatedUnitPrice,
          ],
        );
      }
      await this.recordEvidence(
        client,
        context,
        'procurement.requisition.create',
        'requisition',
        input.id,
        { lineCount: input.lines.length, currency: input.currency },
      );
      return { id: input.id, version: 1 };
    });
  }

  async postJournal(input: PostJournalInput, context: RequestContext): Promise<CommandResult> {
    this.assertAuthorized('finance.journal.post', input.tenantId, context);
    return this.transaction(context, async (client) => {
      await client.query(
        `INSERT INTO finance.posted_journals
          (tenant_id,id,accounting_date,currency,source_type,source_id,posted_at,posted_by)
         VALUES ($1,$2,$3,$4,$5,$6,clock_timestamp(),$7)`,
        [
          input.tenantId,
          input.id,
          input.accountingDate,
          input.currency,
          input.sourceType,
          input.sourceId,
          context.actorId,
        ],
      );
      for (const [index, line] of input.lines.entries()) {
        await client.query(
          `INSERT INTO finance.posted_journal_lines
            (tenant_id,journal_id,line_number,account_id,debit,credit)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [input.tenantId, input.id, index + 1, line.accountId, line.debit, line.credit],
        );
      }
      await this.recordEvidence(
        client,
        context,
        'finance.journal.post',
        'posted_journal',
        input.id,
        {
          accountingDate: input.accountingDate,
          currency: input.currency,
          lineCount: input.lines.length,
        },
      );
      return { id: input.id, version: 1 };
    });
  }

  async applyReceipt(input: ApplyReceiptInput, context: RequestContext): Promise<CommandResult> {
    this.assertAuthorized('finance.receipt.apply', input.tenantId, context);
    return this.transaction(context, async (client) => {
      const receivable = await client.query<{ currency: string; open_amount: string }>(
        `SELECT currency,open_amount::text FROM finance.receivables
          WHERE tenant_id=$1 AND id=$2 AND customer_party_id=$3 FOR UPDATE`,
        [input.tenantId, input.receivableId, input.customerPartyId],
      );
      const row = receivable.rows[0];
      if (
        row === undefined ||
        row.currency !== input.currency ||
        Number(row.open_amount) < input.amount
      )
        throw new OperationConflictError('Receipt cannot be applied to receivable');
      await client.query(
        `INSERT INTO finance.receipts
          (tenant_id,id,customer_party_id,received_on,currency,amount,external_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          input.tenantId,
          input.id,
          input.customerPartyId,
          input.receivedOn,
          input.currency,
          input.amount,
          input.externalReference,
        ],
      );
      await client.query(
        `INSERT INTO finance.receipt_applications
          (tenant_id,receipt_id,receivable_id,amount,applied_at,applied_by)
         VALUES ($1,$2,$3,$4,clock_timestamp(),$5)`,
        [input.tenantId, input.id, input.receivableId, input.amount, context.actorId],
      );
      await client.query(
        `UPDATE finance.receivables SET open_amount=open_amount-$3,
          status=CASE WHEN open_amount-$3=0 THEN 'paid' ELSE 'partial' END
          WHERE tenant_id=$1 AND id=$2`,
        [input.tenantId, input.receivableId, input.amount],
      );
      await this.recordEvidence(client, context, 'finance.receipt.apply', 'receipt', input.id, {
        receivableId: input.receivableId,
        amount: input.amount,
        currency: input.currency,
      });
      return { id: input.id, version: 1 };
    });
  }

  async allocateCost(input: AllocateCostInput, context: RequestContext): Promise<CommandResult> {
    this.assertAuthorized('finance.cost.allocate', input.tenantId, context);
    return this.transaction(context, async (client) => {
      const journal = await client.query<{ currency: string; unallocated: string }>(
        `SELECT j.currency,
                (SELECT coalesce(sum(l.debit),0) FROM finance.posted_journal_lines l
                  WHERE l.tenant_id=j.tenant_id AND l.journal_id=j.id)
                - (SELECT coalesce(sum(a.amount),0) FROM finance.cost_allocations a
                    WHERE a.tenant_id=j.tenant_id AND a.journal_id=j.id) AS unallocated
           FROM finance.posted_journals j
          WHERE j.tenant_id=$1 AND j.id=$2 FOR UPDATE`,
        [input.tenantId, input.journalId],
      );
      const row = journal.rows[0];
      if (
        row === undefined ||
        row.currency !== input.currency ||
        Number(row.unallocated) < input.amount
      )
        throw new OperationConflictError('Allocation exceeds the journal amount or currency');
      await client.query(
        `INSERT INTO finance.cost_allocations
          (tenant_id,id,journal_id,source_cost_center_id,target_cost_center_id,amount,currency,
           rule_id,rule_version,allocated_at,allocated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp(),$10)`,
        [
          input.tenantId,
          input.id,
          input.journalId,
          input.sourceCostCenterId,
          input.targetCostCenterId,
          input.amount,
          input.currency,
          input.ruleId,
          input.ruleVersion,
          context.actorId,
        ],
      );
      await this.recordEvidence(
        client,
        context,
        'finance.cost.allocate',
        'cost_allocation',
        input.id,
        {
          journalId: input.journalId,
          ruleId: input.ruleId,
          ruleVersion: input.ruleVersion,
        },
      );
      return { id: input.id, version: 1 };
    });
  }

  private assertAuthorized(
    action: string,
    resourceTenantId: string,
    context: RequestContext,
  ): void {
    const decision = authorize({
      principal: {
        actorId: entityId(context.actorId),
        tenantId: tenantId(context.tenantId),
        roles: context.roles,
      },
      action,
      resourceTenantId: tenantId(resourceTenantId),
    });
    if (decision !== 'allow') throw new AccessDeniedError('Authorization denied');
  }

  private async assertEmploymentAccess(
    client: PoolClient,
    context: RequestContext,
    employmentId: string,
    allowedTypes: readonly ('employee' | 'manager' | 'hr')[] = ['employee', 'manager', 'hr'],
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM workforce.employment_access
        WHERE tenant_id=$1 AND actor_id=$2 AND employment_id=$3
          AND access_type=ANY($4::varchar[]) AND revoked_at IS NULL`,
      [context.tenantId, context.actorId, employmentId, allowedTypes],
    );
    if (result.rowCount !== 1) throw new AccessDeniedError('Employment access denied');
  }

  private rethrowAttendanceConflict(error: unknown): never {
    const databaseError = error as { code?: string; message?: string };
    if (databaseError.code === '23505' || databaseError.message?.startsWith('attendance ') === true)
      throw new AttendanceConflictError(databaseError.message ?? 'Attendance state conflict');
    throw error;
  }

  private async transaction<T>(
    context: RequestContext,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE company_os_app');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordEvidence(
    client: PoolClient,
    context: RequestContext,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Readonly<Record<string, unknown>>,
    eventType?: string,
  ): Promise<void> {
    const occurredAt = new Date().toISOString();
    await client.query(
      `INSERT INTO audit.intents
        (tenant_id,id,occurred_at,actor_id,action,resource_type,resource_id,decision,request_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'allow',$8,$9)`,
      [
        context.tenantId,
        randomUUID(),
        occurredAt,
        context.actorId,
        action,
        resourceType,
        resourceId,
        context.requestId,
        JSON.stringify(metadata),
      ],
    );
    await client.query(
      `INSERT INTO integration.outbox
        (tenant_id,id,idempotency_key,event_type,aggregate_id,aggregate_version,payload,occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        context.tenantId,
        randomUUID(),
        `${resourceType}:${resourceId}:1:created`,
        eventType ?? `${resourceType}.created.v1`,
        resourceId,
        1,
        JSON.stringify(metadata),
        occurredAt,
      ],
    );
  }
}
