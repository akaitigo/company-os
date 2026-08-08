import { describe, expect, it } from 'vitest';
import {
  createRequisitionSchema,
  createOrganizationUnitSchema,
  postJournalSchema,
  recordAttendanceSchema,
  requestContextSchema,
} from '../../packages/contracts/src/index.js';

describe('boundary contracts', () => {
  it('accepts a bounded organization command and strips nothing implicitly', () => {
    const input = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
      code: 'FIN',
      name: 'Finance',
      effectiveFrom: '2026-04-01',
    };
    expect(createOrganizationUnitSchema.parse(input)).toEqual(input);
    expect(() => createOrganizationUnitSchema.parse({ ...input, unexpected: true })).toThrow();
  });

  it('bounds principal roles', () => {
    expect(() =>
      requestContextSchema.parse({
        requestId: '44444444-4444-4444-8444-444444444444',
        tenantId: '11111111-1111-4111-8111-111111111111',
        actorId: '33333333-3333-4333-8333-333333333333',
        roles: Array.from({ length: 33 }, () => 'reader'),
      }),
    ).toThrow();
  });

  it('rejects unbalanced journals and oversized requisitions', () => {
    const base = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
    };
    expect(() =>
      postJournalSchema.parse({
        ...base,
        accountingDate: '2026-08-09',
        currency: 'JPY',
        sourceType: 'manual',
        sourceId: '33333333-3333-4333-8333-333333333333',
        lines: [
          { accountId: base.id, debit: 100, credit: 0 },
          { accountId: base.id, debit: 0, credit: 99 },
        ],
      }),
    ).toThrow();
    expect(() =>
      postJournalSchema.parse({
        ...base,
        accountingDate: '2026-08-09',
        currency: 'USD',
        sourceType: 'manual',
        sourceId: '33333333-3333-4333-8333-333333333333',
        lines: [
          { accountId: base.id, debit: 0.1 + 0.2, credit: 0 },
          { accountId: base.id, debit: 0, credit: 0.3 },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      createRequisitionSchema.parse({
        ...base,
        organizationUnitId: base.id,
        currency: 'JPY',
        purpose: 'Office equipment',
        lines: [],
      }),
    ).toThrow();
  });

  it('rejects malformed attendance boundaries', () => {
    expect(() =>
      recordAttendanceSchema.parse({
        id: '22222222-2222-4222-8222-222222222222',
        tenantId: '11111111-1111-4111-8111-111111111111',
        employmentId: '33333333-3333-4333-8333-333333333333',
        workDate: '2026-08-09',
        startedAt: 'not-a-time',
        endedAt: '2026-08-09T09:00:00Z',
        breakMinutes: -1,
        source: 'clock',
      }),
    ).toThrow();
  });
});
