import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { createAuditIntent } from '@company-os/audit';
import { authorize } from '@company-os/authorization';
import type { CreateOrganizationUnitInput, RequestContext } from '@company-os/contracts';
import { createOutboxEnvelope } from '@company-os/integration';
import { entityId, tenantId } from '@company-os/kernel';
import { OrganizationUnit } from '@company-os/organization';
import { Pool } from 'pg';

export class AccessDeniedError extends Error {}

@Injectable()
export class OrganizationService {
  private readonly pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
  });

  async create(
    input: CreateOrganizationUnitInput,
    context: RequestContext,
  ): Promise<{ id: string; version: number }> {
    const principal = {
      actorId: entityId(context.actorId),
      tenantId: tenantId(context.tenantId),
      roles: context.roles,
    };
    const decision = authorize({
      principal,
      action: 'organization.unit.create',
      resourceTenantId: tenantId(input.tenantId),
    });
    if (decision !== 'allow') throw new AccessDeniedError('Authorization denied');

    const unit = OrganizationUnit.create({
      id: entityId(input.id),
      tenantId: tenantId(input.tenantId),
      code: input.code,
      name: input.name,
      period: {
        from: input.effectiveFrom,
        ...(input.effectiveTo === undefined ? {} : { to: input.effectiveTo }),
      },
      ...(input.parentId === undefined ? {} : { parentId: entityId(input.parentId) }),
    });
    const occurredAt = new Date().toISOString();
    const event = unit.createdEvent(randomUUID(), occurredAt);
    const envelope = createOutboxEnvelope(event, occurredAt);
    const audit = createAuditIntent({
      id: randomUUID(),
      occurredAt,
      tenantId: principal.tenantId,
      actorId: principal.actorId,
      action: 'organization.unit.create',
      resourceType: 'organization_unit',
      resourceId: unit.snapshot().id,
      decision: 'allow',
      requestId: context.requestId,
      metadata: { code: input.code },
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE company_os_app');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      await client.query(
        `INSERT INTO organization.units
          (tenant_id,id,code,name,parent_id,effective_from,effective_to,version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
        [
          input.tenantId,
          input.id,
          input.code,
          input.name,
          input.parentId ?? null,
          input.effectiveFrom,
          input.effectiveTo ?? null,
        ],
      );
      await client.query(
        `INSERT INTO audit.intents
          (tenant_id,id,occurred_at,actor_id,action,resource_type,resource_id,decision,request_id,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          audit.tenantId,
          audit.id,
          audit.occurredAt,
          audit.actorId,
          audit.action,
          audit.resourceType,
          audit.resourceId,
          audit.decision,
          audit.requestId,
          JSON.stringify(audit.metadata),
        ],
      );
      await client.query(
        `INSERT INTO integration.outbox
          (tenant_id,id,idempotency_key,event_type,aggregate_id,aggregate_version,payload,occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          event.tenantId,
          envelope.id,
          envelope.idempotencyKey,
          event.type,
          event.aggregateId,
          event.aggregateVersion,
          JSON.stringify(event.payload),
          event.occurredAt,
        ],
      );
      await client.query('COMMIT');
      return { id: input.id, version: 1 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
