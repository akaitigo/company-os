import { describe, expect, it, vi } from 'vitest';
import { entityId, tenantId, type DomainEvent } from '../../packages/kernel/src/index.js';
import { createAuditIntent } from '../../modules/audit/src/index.js';
import { createOutboxEnvelope, IdempotencyLedger } from '../../modules/integration/src/index.js';

const tenant = tenantId('11111111-1111-4111-8111-111111111111');
const aggregate = entityId('22222222-2222-4222-8222-222222222222');
const actor = entityId('33333333-3333-4333-8333-333333333333');

describe('audit and integration invariants', () => {
  it('rejects sensitive metadata', () => {
    expect(() =>
      createAuditIntent({
        id: 'audit-1',
        occurredAt: '2026-01-01T00:00:00Z',
        tenantId: tenant,
        actorId: actor,
        action: 'read',
        resourceType: 'unit',
        resourceId: aggregate,
        decision: 'allow',
        requestId: 'request-1',
        metadata: { accessToken: 'leak' },
      }),
    ).toThrowError(/Sensitive C4/);
    expect(
      createAuditIntent({
        id: 'audit-2',
        occurredAt: '2026-01-01T00:00:00Z',
        tenantId: tenant,
        actorId: actor,
        action: 'read',
        resourceType: 'unit',
        resourceId: aggregate,
        decision: 'allow',
        requestId: 'request-2',
        metadata: { resultCount: 1 },
      }).metadata.resultCount,
    ).toBe(1);
  });

  it('builds deterministic idempotency keys and ignores replay', () => {
    const event: DomainEvent = {
      id: 'event-1',
      type: 'organization.unit.created.v1',
      occurredAt: '2026-01-01T00:00:00Z',
      tenantId: tenant,
      aggregateId: aggregate,
      aggregateVersion: 1,
      payload: {},
    };
    const envelope = createOutboxEnvelope(event, '2026-01-01T00:00:00Z');
    const handler = vi.fn();
    const ledger = new IdempotencyLedger();
    expect(ledger.process(envelope.idempotencyKey, handler)).toBe(true);
    expect(ledger.process(envelope.idempotencyKey, handler)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(() =>
      createOutboxEnvelope({ ...event, aggregateVersion: 0 }, '2026-01-01T00:00:00Z'),
    ).toThrowError(/positive/);
  });
});
