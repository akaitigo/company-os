import { describe, expect, it } from 'vitest';
import { Money, entityId, tenantId } from '../../packages/kernel/src/index.js';
import {
  Requisition,
  ThreeWayMatcher,
  assertPaymentSoD,
} from '../../modules/source-to-pay/src/index.js';
const lineId = entityId('11111111-1111-4111-8111-111111111111');
const actorA = entityId('22222222-2222-4222-8222-222222222222');
const actorB = entityId('33333333-3333-4333-8333-333333333333');
describe('source-to-pay controls', () => {
  it('matches PO, receipt, and invoice within explicit tolerance', () => {
    const matcher = new ThreeWayMatcher(20n);
    const order = { lineId, quantity: 10n, unitPrice: Money.ofMinor(100n, 'JPY') };
    expect(
      matcher.match(
        order,
        { purchaseOrderLineId: lineId, quantity: 10n },
        { purchaseOrderLineId: lineId, quantity: 10n, unitPrice: Money.ofMinor(102n, 'JPY') },
      ),
    ).toBe('matched');
    expect(
      matcher.match(
        order,
        { purchaseOrderLineId: lineId, quantity: 5n },
        { purchaseOrderLineId: lineId, quantity: 6n, unitPrice: Money.ofMinor(100n, 'JPY') },
      ),
    ).toBe('exception');
  });
  it('enforces payment maker-checker segregation', () => {
    const base = {
      id: lineId,
      tenantId: tenantId('44444444-4444-4444-8444-444444444444'),
      amount: Money.ofMinor(1n, 'JPY'),
    };
    expect(() => {
      assertPaymentSoD({ ...base, preparedBy: actorA, approvedBy: actorA });
    }).toThrowError(/Preparer/);
    expect(() => {
      assertPaymentSoD({ ...base, preparedBy: actorA, approvedBy: actorB });
    }).not.toThrow();
  });
  it('requires approval by someone other than the requisition requester', () => {
    const requisition = new Requisition(
      lineId,
      tenantId('44444444-4444-4444-8444-444444444444'),
      actorA,
      Money.ofMinor(10_000n, 'JPY'),
    );
    requisition.submit();
    expect(() => {
      requisition.approve(actorA);
    }).toThrowError(/Requester/);
    requisition.approve(actorB);
    requisition.convertToPurchaseOrder();
    expect(requisition.snapshot().status).toBe('converted');
  });
});
