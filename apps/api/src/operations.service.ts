import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { authorize } from '@company-os/authorization';
import type {
  CreateRequisitionInput,
  PostJournalInput,
  RecordAttendanceInput,
  RequestContext,
} from '@company-os/contracts';
import { entityId, tenantId } from '@company-os/kernel';
import { Pool, type PoolClient } from 'pg';
import { AccessDeniedError } from './organization.service.js';

type CommandResult = Readonly<{ id: string; version: number }>;

@Injectable()
export class OperationsService {
  private readonly pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
  });

  async recordAttendance(
    input: RecordAttendanceInput,
    context: RequestContext,
  ): Promise<CommandResult> {
    this.assertAuthorized('workforce.attendance.record', input.tenantId, context);
    return this.transaction(context, async (client) => {
      await client.query(
        `INSERT INTO workforce.attendance_entries
          (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$9)`,
        [
          input.tenantId,
          input.id,
          input.employmentId,
          input.workDate,
          input.startedAt,
          input.endedAt,
          input.breakMinutes,
          input.source,
          context.actorId,
        ],
      );
      await this.recordEvidence(
        client,
        context,
        'workforce.attendance.record',
        'attendance',
        input.id,
        {
          workDate: input.workDate,
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
        `${resourceType}.created.v1`,
        resourceId,
        1,
        JSON.stringify(metadata),
        occurredAt,
      ],
    );
  }
}
