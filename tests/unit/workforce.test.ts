import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import {
  AttendanceEntry,
  AttendancePeriodTransition,
  AttendanceReview,
  classifyDailyWork,
  Employment,
  LeaveBalance,
  LeaveRequest,
} from '../../modules/workforce/src/index.js';
const id = entityId('11111111-1111-4111-8111-111111111111');
const worker = entityId('22222222-2222-4222-8222-222222222222');
const tenant = tenantId('33333333-3333-4333-8333-333333333333');
describe('workforce invariants', () => {
  it('requires explicit review and period transition reasons', () => {
    expect(new AttendanceReview('approved', ' verified ').reason).toBe('verified');
    expect(() => new AttendanceReview('rejected', ' ')).toThrowError(/1 to 500/);
    expect(new AttendancePeriodTransition('2026-08-01', 'close', 'payroll cutoff').action).toBe(
      'close',
    );
    expect(() => new AttendancePeriodTransition('2026-08-02', 'close', 'cutoff')).toThrowError(
      /first day/,
    );
  });
  it('enforces employment transitions and period', () => {
    const employment = new Employment(id, tenant, worker, { from: '2026-04-01' }, 2_400);
    employment.activate();
    employment.end('2027-03-31');
    expect(employment.snapshot().status).toBe('ended');
    expect(() => {
      employment.activate();
    }).toThrowError(/draft/);
    expect(() => new Employment(id, tenant, worker, { from: '2026-04-01' }, 10_081)).toThrowError(
      /one week/,
    );
  });
  it('reserves, approves and cancels leave without negative balances', () => {
    const balance = new LeaveBalance(960);
    balance.reserve(480);
    balance.approve(240);
    balance.cancel(240);
    expect(balance.available()).toBe(720);
    expect(() => {
      balance.reserve(721);
    }).toThrowError(/negative/);
    expect(() => {
      balance.approve(1);
    }).toThrowError(/unreserved/);
  });
  it('reserves leave at request time and enforces maker-checker approval', () => {
    const balance = new LeaveBalance(960);
    const request = new LeaveRequest(id, worker, 480, balance);
    expect(balance.available()).toBe(480);
    expect(() => {
      request.approve(worker);
    }).toThrowError(/own leave/);
    request.approve(id);
    expect(request.snapshot().status).toBe('approved');
    expect(balance.available()).toBe(480);
  });
  it('calculates arbitrary attendance with multiple non-overlapping breaks', () => {
    const entry = new AttendanceEntry({
      workDate: '2026-08-09',
      startedAt: '2026-08-09T08:30:00+09:00',
      endedAt: '2026-08-09T18:15:00+09:00',
      timeZone: 'Asia/Tokyo',
      breaks: [
        { startedAt: '2026-08-09T12:00:00+09:00', endedAt: '2026-08-09T12:45:00+09:00' },
        { startedAt: '2026-08-09T15:00:00+09:00', endedAt: '2026-08-09T15:15:00+09:00' },
      ],
    });
    expect(entry).toMatchObject({ elapsedMinutes: 585, breakMinutes: 60, workedMinutes: 525 });
  });
  it('rejects overlapping, out-of-bounds and mismatched attendance', () => {
    const base = {
      workDate: '2026-08-09',
      startedAt: '2026-08-09T09:00:00+09:00',
      endedAt: '2026-08-09T18:00:00+09:00',
      timeZone: 'Asia/Tokyo' as const,
    };
    expect(
      () =>
        new AttendanceEntry({
          ...base,
          breaks: [
            { startedAt: '2026-08-09T12:00:00+09:00', endedAt: '2026-08-09T13:00:00+09:00' },
            { startedAt: '2026-08-09T12:30:00+09:00', endedAt: '2026-08-09T13:30:00+09:00' },
          ],
        }),
    ).toThrowError(/overlap/);
    expect(
      () =>
        new AttendanceEntry({
          ...base,
          breaks: [
            { startedAt: '2026-08-09T08:30:00+09:00', endedAt: '2026-08-09T09:30:00+09:00' },
          ],
        }),
    ).toThrowError(/bounds/);
    expect(() => new AttendanceEntry({ ...base, workDate: '2026-08-08', breaks: [] })).toThrowError(
      /timezone/,
    );
  });
  it('classifies schedule, statutory overtime, night and holiday minutes without rounding', () => {
    const entry = new AttendanceEntry({
      workDate: '2026-08-09',
      startedAt: '2026-08-09T08:30:00+09:00',
      endedAt: '2026-08-09T18:15:00+09:00',
      timeZone: 'Asia/Tokyo',
      breaks: [{ startedAt: '2026-08-09T12:00:00+09:00', endedAt: '2026-08-09T12:45:00+09:00' }],
    });
    const result = classifyDailyWork(
      entry,
      {
        ruleVersionId: '44444444-4444-4444-8444-444444444444',
        ruleCode: 'STANDARD',
        ruleVersion: 1,
        timeZone: 'Asia/Tokyo',
        scheduledStartMinute: 540,
        scheduledEndMinute: 1080,
        statutoryDailyMinutes: 480,
        nightStartMinute: 1320,
        nightEndMinute: 300,
        requirementId: 'JP-LABOR-003',
        expertReviewStatus: 'approved',
      },
      new Set(['2026-08-09']),
    );
    expect(result).toMatchObject({
      workedMinutes: 540,
      scheduledMinutes: 495,
      outsideScheduleMinutes: 45,
      statutoryOvertimeMinutes: 60,
      nightMinutes: 0,
      statutoryHolidayMinutes: 540,
    });
  });
  it('classifies overnight schedule and excludes breaks from overlapping dimensions', () => {
    const entry = new AttendanceEntry({
      workDate: '2026-08-10',
      startedAt: '2026-08-10T21:00:00+09:00',
      endedAt: '2026-08-11T06:00:00+09:00',
      timeZone: 'Asia/Tokyo',
      breaks: [{ startedAt: '2026-08-11T01:00:00+09:00', endedAt: '2026-08-11T02:00:00+09:00' }],
    });
    const result = classifyDailyWork(
      entry,
      {
        ruleVersionId: '44444444-4444-4444-8444-444444444444',
        ruleCode: 'NIGHT',
        ruleVersion: 1,
        timeZone: 'Asia/Tokyo',
        scheduledStartMinute: 1320,
        scheduledEndMinute: 300,
        statutoryDailyMinutes: 480,
        nightStartMinute: 1320,
        nightEndMinute: 300,
        requirementId: 'JP-LABOR-003',
        expertReviewStatus: 'approved',
      },
      new Set(['2026-08-11']),
    );
    expect(result).toMatchObject({
      workedMinutes: 480,
      scheduledMinutes: 360,
      outsideScheduleMinutes: 120,
      statutoryOvertimeMinutes: 0,
      nightMinutes: 360,
      statutoryHolidayMinutes: 300,
    });
  });
  it('treats an explicit non-working calendar date as outside schedule', () => {
    const entry = new AttendanceEntry({
      workDate: '2026-08-10',
      startedAt: '2026-08-10T09:00:00+09:00',
      endedAt: '2026-08-10T18:00:00+09:00',
      timeZone: 'Asia/Tokyo',
      breaks: [],
    });
    const result = classifyDailyWork(
      entry,
      {
        ruleVersionId: '44444444-4444-4444-8444-444444444444',
        ruleCode: 'STANDARD',
        ruleVersion: 1,
        timeZone: 'Asia/Tokyo',
        scheduledStartMinute: 540,
        scheduledEndMinute: 1080,
        statutoryDailyMinutes: 480,
        nightStartMinute: 1320,
        nightEndMinute: 300,
        requirementId: 'JP-LABOR-003',
        expertReviewStatus: 'approved',
      },
      new Set(),
      new Set(['2026-08-10']),
    );
    expect(result.scheduledMinutes).toBe(0);
    expect(result.outsideScheduleMinutes).toBe(540);
  });
  it('rejects attendance and break timestamps that are not minute aligned', () => {
    expect(
      () =>
        new AttendanceEntry({
          workDate: '2026-08-10',
          startedAt: '2026-08-10T09:00:30+09:00',
          endedAt: '2026-08-10T10:00:30+09:00',
          timeZone: 'Asia/Tokyo',
          breaks: [],
        }),
    ).toThrowError(/follow start/);
    expect(
      () =>
        new AttendanceEntry({
          workDate: '2026-08-10',
          startedAt: '2026-08-10T09:00:00+09:00',
          endedAt: '2026-08-10T11:00:00+09:00',
          timeZone: 'Asia/Tokyo',
          breaks: [
            {
              startedAt: '2026-08-10T10:00:30+09:00',
              endedAt: '2026-08-10T10:30:30+09:00',
            },
          ],
        }),
    ).toThrowError(/whole minutes/);
  });
});
