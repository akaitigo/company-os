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
