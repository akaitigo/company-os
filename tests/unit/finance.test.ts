import { describe, expect, it } from 'vitest';
import { Journal, Receivable, assertCostAllocation } from '../../modules/finance/src/index.js';
import { Money, entityId, tenantId } from '../../packages/kernel/src/index.js';
const journalId = entityId('11111111-1111-4111-8111-111111111111');
const reversalId = entityId('22222222-2222-4222-8222-222222222222');
const cash = entityId('33333333-3333-4333-8333-333333333333');
const revenue = entityId('44444444-4444-4444-8444-444444444444');
const tenant = tenantId('55555555-5555-4555-8555-555555555555');
describe('finance journal', () => {
  it('posts a balanced journal, stays immutable, and reverses by new journal', () => {
    const journal = new Journal(journalId, tenant, '2026-08-09');
    journal.addLine({
      accountId: cash,
      debit: Money.ofMinor(100n, 'JPY'),
      credit: Money.ofMinor(0n, 'JPY'),
    });
    journal.addLine({
      accountId: revenue,
      debit: Money.ofMinor(0n, 'JPY'),
      credit: Money.ofMinor(100n, 'JPY'),
    });
    journal.post();
    expect(() => {
      journal.addLine({
        accountId: cash,
        debit: Money.ofMinor(1n, 'JPY'),
        credit: Money.ofMinor(0n, 'JPY'),
      });
    }).toThrowError(/immutable/);
    expect(journal.reverse(reversalId).snapshot().status).toBe('posted');
    expect(journal.snapshot().status).toBe('reversed');
  });
  it('rejects unbalanced journals', () => {
    const journal = new Journal(journalId, tenant, '2026-08-09');
    journal.addLine({
      accountId: cash,
      debit: Money.ofMinor(100n, 'JPY'),
      credit: Money.ofMinor(0n, 'JPY'),
    });
    journal.addLine({
      accountId: revenue,
      debit: Money.ofMinor(0n, 'JPY'),
      credit: Money.ofMinor(99n, 'JPY'),
    });
    expect(() => {
      journal.post();
    }).toThrowError(/equal/);
  });
  it('tracks partial receipt applications without allowing over-application', () => {
    const receivable = new Receivable(journalId, tenant, Money.ofMinor(1_000n, 'JPY'));
    receivable.apply(Money.ofMinor(400n, 'JPY'));
    expect(receivable.snapshot()).toEqual({ status: 'partial', openMinor: 600n });
    expect(() => {
      receivable.apply(Money.ofMinor(601n, 'JPY'));
    }).toThrowError(/exceeds/);
    receivable.apply(Money.ofMinor(600n, 'JPY'));
    expect(receivable.snapshot()).toEqual({ status: 'paid', openMinor: 0n });
  });
  it('rejects circular or non-positive cost allocations', () => {
    expect(() => {
      assertCostAllocation({
        sourceCostCenterId: cash,
        targetCostCenterId: cash,
        amount: Money.ofMinor(100n, 'JPY'),
        ruleVersion: 1,
      });
    }).toThrowError(/differ/);
    expect(() => {
      assertCostAllocation({
        sourceCostCenterId: cash,
        targetCostCenterId: revenue,
        amount: Money.ofMinor(100n, 'JPY'),
        ruleVersion: 1,
      });
    }).not.toThrow();
  });
});
