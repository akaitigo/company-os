import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import {
  AttendanceEntry,
  Employment,
  LeaveBalance,
  LeaveRequest,
} from '../../modules/workforce/src/index.js';
const id = entityId('11111111-1111-4111-8111-111111111111');
const worker = entityId('22222222-2222-4222-8222-222222222222');
const tenant = tenantId('33333333-3333-4333-8333-333333333333');
describe('workforce invariants', () => {
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
});
