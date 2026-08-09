'use client';
import { useState, type SyntheticEvent } from 'react';

const demo = {
  employmentId: '10000000-0000-4000-8000-000000000003',
  organizationUnitId: '10000000-0000-4000-8000-000000000001',
  cashAccountId: '10000000-0000-4000-8000-000000000004',
  expenseAccountId: '10000000-0000-4000-8000-000000000005',
} as const;

async function command(name: string, body: Record<string, unknown>): Promise<boolean> {
  const response = await fetch(`/api/commands/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function OperationsForms(): React.JSX.Element {
  const [requisitionStatus, setRequisitionStatus] = useState('');
  const [journalStatus, setJournalStatus] = useState('');

  async function requisition(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await command('requisition', {
      id: crypto.randomUUID(),
      organizationUnitId: demo.organizationUnitId,
      currency: 'JPY',
      purpose: field(data, 'purpose'),
      lines: [
        {
          id: crypto.randomUUID(),
          description: field(data, 'description'),
          quantity: 1,
          estimatedUnitPrice: Number(field(data, 'amount')),
        },
      ],
    });
    setRequisitionStatus(ok ? '購買申請を提出しました。' : '購買申請を提出できませんでした。');
  }

  async function journal(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(field(data, 'amount'));
    const ok = await command('journal', {
      id: crypto.randomUUID(),
      accountingDate: field(data, 'accountingDate'),
      currency: 'JPY',
      sourceType: 'manual-console',
      sourceId: crypto.randomUUID(),
      lines: [
        { accountId: demo.expenseAccountId, debit: amount, credit: 0 },
        { accountId: demo.cashAccountId, debit: 0, credit: amount },
      ],
    });
    setJournalStatus(ok ? '仕訳を転記しました。' : '仕訳を転記できませんでした。');
  }

  return (
    <div className="operations-grid">
      <section aria-labelledby="requisition-heading">
        <h2 id="requisition-heading">購買申請</h2>
        <form onSubmit={(event) => void requisition(event)}>
          <label>
            目的
            <input required name="purpose" maxLength={1000} />
          </label>
          <label>
            品目
            <input required name="description" maxLength={500} />
          </label>
          <label>
            見積額（JPY）
            <input required name="amount" type="number" min="1" max="1000000000" />
          </label>
          <button type="submit">申請</button>
          <p role="status" aria-live="polite">
            {requisitionStatus}
          </p>
        </form>
      </section>
      <section aria-labelledby="journal-heading">
        <h2 id="journal-heading">仕訳</h2>
        <form onSubmit={(event) => void journal(event)}>
          <label>
            会計日
            <input required name="accountingDate" type="date" />
          </label>
          <label>
            金額（JPY）
            <input required name="amount" type="number" min="1" max="1000000000" />
          </label>
          <button type="submit">転記</button>
          <p role="status" aria-live="polite">
            {journalStatus}
          </p>
        </form>
      </section>
    </div>
  );
}
