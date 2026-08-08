import type { Money } from '@company-os/kernel';
import { DomainError, type EntityId, type TenantId } from '@company-os/kernel';
export interface JournalLine {
  readonly accountId: EntityId;
  readonly debit: Money;
  readonly credit: Money;
}
export type JournalStatus = 'draft' | 'posted' | 'reversed';
export class Journal {
  private status: JournalStatus = 'draft';
  private readonly lines: JournalLine[] = [];
  constructor(
    readonly id: EntityId,
    readonly tenantId: TenantId,
    readonly accountingDate: string,
  ) {
    if (!Number.isFinite(Date.parse(accountingDate)))
      throw new DomainError('INVALID_ACCOUNTING_DATE', 'Accounting date is invalid');
  }
  addLine(line: JournalLine): void {
    if (this.status !== 'draft')
      throw new DomainError('POSTED_JOURNAL_IMMUTABLE', 'Posted journal is immutable');
    if (line.debit.currency !== line.credit.currency)
      throw new DomainError('CURRENCY_MISMATCH', 'Line currencies must match');
    const hasDebit = line.debit.minor > 0n;
    const hasCredit = line.credit.minor > 0n;
    if (hasDebit === hasCredit)
      throw new DomainError('INVALID_JOURNAL_LINE', 'Line requires exactly one debit or credit');
    this.lines.push(line);
  }
  post(): void {
    if (this.status !== 'draft' || this.lines.length < 2)
      throw new DomainError('INVALID_JOURNAL_STATE', 'Draft journal needs at least two lines');
    const currency = this.lines[0]?.debit.currency;
    if (currency === undefined || this.lines.some((line) => line.debit.currency !== currency))
      throw new DomainError('CURRENCY_MISMATCH', 'Journal currency must be uniform');
    const debit = this.lines.reduce((sum, line) => sum + line.debit.minor, 0n);
    const credit = this.lines.reduce((sum, line) => sum + line.credit.minor, 0n);
    if (debit !== credit)
      throw new DomainError('UNBALANCED_JOURNAL', 'Total debit must equal total credit');
    this.status = 'posted';
  }
  reverse(newId: EntityId): Journal {
    if (this.status !== 'posted')
      throw new DomainError('INVALID_JOURNAL_STATE', 'Only posted journal can reverse');
    const reversal = new Journal(newId, this.tenantId, this.accountingDate);
    for (const line of this.lines)
      reversal.addLine({ accountId: line.accountId, debit: line.credit, credit: line.debit });
    reversal.post();
    this.status = 'reversed';
    return reversal;
  }
  snapshot(): { status: JournalStatus; lines: readonly JournalLine[] } {
    return { status: this.status, lines: [...this.lines] };
  }
}
export type ReceivableStatus = 'open' | 'partial' | 'paid' | 'written_off';
export class Receivable {
  private openMinor: bigint;
  private status: ReceivableStatus = 'open';
  constructor(
    readonly id: EntityId,
    readonly tenantId: TenantId,
    readonly originalAmount: Money,
  ) {
    if (originalAmount.minor <= 0n)
      throw new DomainError('INVALID_RECEIVABLE_AMOUNT', 'Receivable must be positive');
    this.openMinor = originalAmount.minor;
  }
  apply(amount: Money): void {
    if (amount.currency !== this.originalAmount.currency)
      throw new DomainError('CURRENCY_MISMATCH', 'Receipt currency must match receivable');
    if (amount.minor <= 0n || amount.minor > this.openMinor)
      throw new DomainError('INVALID_RECEIPT_APPLICATION', 'Application exceeds open amount');
    this.openMinor -= amount.minor;
    this.status = this.openMinor === 0n ? 'paid' : 'partial';
  }
  writeOff(): void {
    if (this.status === 'paid' || this.status === 'written_off')
      throw new DomainError('INVALID_RECEIVABLE_STATE', 'Closed receivable cannot be written off');
    this.openMinor = 0n;
    this.status = 'written_off';
  }
  snapshot(): { status: ReceivableStatus; openMinor: bigint } {
    return { status: this.status, openMinor: this.openMinor };
  }
}
export interface CostAllocation {
  readonly sourceCostCenterId: EntityId;
  readonly targetCostCenterId: EntityId;
  readonly amount: Money;
  readonly ruleVersion: number;
}
export function assertCostAllocation(allocation: CostAllocation): void {
  if (allocation.sourceCostCenterId === allocation.targetCostCenterId)
    throw new DomainError('INVALID_COST_ALLOCATION', 'Source and target must differ');
  if (
    allocation.amount.minor <= 0n ||
    !Number.isInteger(allocation.ruleVersion) ||
    allocation.ruleVersion <= 0
  )
    throw new DomainError(
      'INVALID_COST_ALLOCATION',
      'Allocation amount and rule version must be positive',
    );
}
