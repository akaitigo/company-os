import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import { Employment, LeaveBalance } from '../../modules/workforce/src/index.js';
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
});
