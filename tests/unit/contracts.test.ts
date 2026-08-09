import { describe, expect, it } from 'vitest';
import {
  allocateCostSchema,
  applyReceiptSchema,
  createRequisitionSchema,
  createOrganizationUnitSchema,
  createWorkRuleSchema,
  decideAttendanceSchema,
  postJournalSchema,
  recordAttendanceSchema,
  requestLeaveSchema,
  requestContextSchema,
  transitionAttendancePeriodSchema,
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

  it('validates versioned daily work rules at the boundary', () => {
    const input = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
      ruleCode: 'STANDARD',
      version: 1,
      effectiveFrom: '2026-04-01',
      timeZone: 'Asia/Tokyo' as const,
      scheduledStartMinute: 540,
      scheduledEndMinute: 1080,
      statutoryDailyMinutes: 480,
      nightStartMinute: 1320,
      nightEndMinute: 300,
      statutoryHolidayWeekdays: [0],
      requirementId: 'JP-LABOR-003',
      controlId: 'CTL-LABOR-OVERTIME-001',
      expertReviewStatus: 'pending' as const,
    };
    expect(createWorkRuleSchema.parse(input)).toEqual(input);
    expect(() => createWorkRuleSchema.parse({ ...input, statutoryDailyMinutes: 1441 })).toThrow();
    expect(() => createWorkRuleSchema.parse({ ...input, scheduledEndMinute: 540 })).toThrow();
    expect(() => createWorkRuleSchema.parse({ ...input, unexpected: true })).toThrow();
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
        timeZone: 'Asia/Tokyo',
        breaks: [],
        source: 'clock',
      }),
    ).toThrow();
  });

  it('accepts bounded attendance break intervals and correction identity', () => {
    const input = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
      employmentId: '33333333-3333-4333-8333-333333333333',
      workDate: '2026-08-09',
      startedAt: '2026-08-09T08:30:00+09:00',
      endedAt: '2026-08-09T18:15:00+09:00',
      timeZone: 'Asia/Tokyo',
      source: 'manual' as const,
      breaks: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          startedAt: '2026-08-09T12:00:00+09:00',
          endedAt: '2026-08-09T12:45:00+09:00',
        },
      ],
    };
    expect(recordAttendanceSchema.parse(input)).toEqual(input);
    expect(() =>
      recordAttendanceSchema.parse({
        ...input,
        breaks: Array.from({ length: 11 }, () => input.breaks[0]),
      }),
    ).toThrow();
  });

  it('bounds attendance decisions and calendar-month transitions', () => {
    const base = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
      employmentId: '33333333-3333-4333-8333-333333333333',
    };
    expect(
      decideAttendanceSchema.parse({
        ...base,
        attendanceEntryId: '44444444-4444-4444-8444-444444444444',
        decision: 'approved',
        reason: 'verified',
      }).reason,
    ).toBe('verified');
    expect(() =>
      decideAttendanceSchema.parse({
        ...base,
        attendanceEntryId: '44444444-4444-4444-8444-444444444444',
        decision: 'rejected',
        reason: ' ',
      }),
    ).toThrow();
    expect(() =>
      transitionAttendancePeriodSchema.parse({
        ...base,
        periodMonth: '2026-08-02',
        action: 'close',
        reason: 'cutoff',
      }),
    ).toThrow();
  });

  it('bounds leave, receipt, and allocation commands', () => {
    const base = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
    };
    expect(() =>
      requestLeaveSchema.parse({
        ...base,
        employmentId: '33333333-3333-4333-8333-333333333333',
        leaveType: 'annual',
        startsOn: '2026-08-10',
        endsOn: '2026-08-09',
        requestedMinutes: 480,
      }),
    ).toThrow();
    expect(() =>
      applyReceiptSchema.parse({
        ...base,
        receivableId: '33333333-3333-4333-8333-333333333333',
        customerPartyId: '44444444-4444-4444-8444-444444444444',
        receivedOn: '2026-08-09',
        currency: 'JPY',
        amount: 0,
        externalReference: 'BANK-001',
      }),
    ).toThrow();
    expect(() =>
      allocateCostSchema.parse({
        ...base,
        journalId: '33333333-3333-4333-8333-333333333333',
        sourceCostCenterId: '44444444-4444-4444-8444-444444444444',
        targetCostCenterId: '44444444-4444-4444-8444-444444444444',
        amount: 100,
        currency: 'JPY',
        ruleId: 'RULE-COST-001',
        ruleVersion: 1,
      }),
    ).toThrow();
  });
});
