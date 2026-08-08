import type { Money } from '@company-os/kernel';
import { DomainError, type EntityId, type TenantId } from '@company-os/kernel';
export interface PurchaseOrderLine {
  readonly lineId: EntityId;
  readonly quantity: bigint;
  readonly unitPrice: Money;
}
export interface ReceiptLine {
  readonly purchaseOrderLineId: EntityId;
  readonly quantity: bigint;
}
export interface InvoiceLine {
  readonly purchaseOrderLineId: EntityId;
  readonly quantity: bigint;
  readonly unitPrice: Money;
}
export class ThreeWayMatcher {
  constructor(private readonly amountToleranceMinor: bigint = 0n) {
    if (amountToleranceMinor < 0n)
      throw new DomainError('INVALID_TOLERANCE', 'Tolerance cannot be negative');
  }
  match(
    order: PurchaseOrderLine,
    receipt: ReceiptLine,
    invoice: InvoiceLine,
  ): 'matched' | 'exception' {
    if (
      order.lineId !== receipt.purchaseOrderLineId ||
      order.lineId !== invoice.purchaseOrderLineId
    )
      return 'exception';
    if (
      order.quantity <= 0n ||
      receipt.quantity < invoice.quantity ||
      invoice.quantity > order.quantity
    )
      return 'exception';
    if (order.unitPrice.currency !== invoice.unitPrice.currency) return 'exception';
    const ordered = order.unitPrice.minor * invoice.quantity;
    const invoiced = invoice.unitPrice.minor * invoice.quantity;
    const variance = ordered >= invoiced ? ordered - invoiced : invoiced - ordered;
    return variance <= this.amountToleranceMinor ? 'matched' : 'exception';
  }
}
export interface PaymentInstruction {
  readonly id: EntityId;
  readonly tenantId: TenantId;
  readonly preparedBy: EntityId;
  readonly approvedBy: EntityId;
  readonly amount: Money;
}
export function assertPaymentSoD(payment: PaymentInstruction): void {
  if (payment.preparedBy === payment.approvedBy)
    throw new DomainError('PAYMENT_SOD_VIOLATION', 'Preparer cannot approve payment');
  if (payment.amount.minor <= 0n)
    throw new DomainError('INVALID_PAYMENT_AMOUNT', 'Payment must be positive');
}
