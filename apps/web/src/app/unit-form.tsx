'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
interface Unit {
  id: string;
  code: string;
  name: string;
  version: number;
}
export function UnitForm(): React.JSX.Element {
  const [units, setUnits] = useState<Unit[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(): Promise<void> {
    const response = await fetch('/api/organization-units');
    if (response.ok) setUnits((await response.json()) as Unit[]);
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage('');
    const data = new FormData(form);
    const response = await fetch('/api/organization-units', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        code: data.get('code'),
        name: data.get('name'),
        effectiveFrom: data.get('effectiveFrom'),
      }),
    });
    if (response.ok) {
      setMessage('組織単位を作成しました。反映には数秒かかる場合があります。');
      form.reset();
      await load();
    } else {
      const error = (await response.json()) as { message?: string };
      setMessage(error.message ?? '作成できませんでした。');
    }
    setBusy(false);
  }
  return (
    <section aria-labelledby="unit-heading">
      <h2 id="unit-heading">組織単位</h2>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        aria-describedby="form-status"
      >
        <label>
          コード
          <input required name="code" maxLength={32} pattern="[A-Z0-9_-]+" autoComplete="off" />
        </label>
        <label>
          名称
          <input required name="name" maxLength={200} autoComplete="organization" />
        </label>
        <label>
          適用開始日
          <input required name="effectiveFrom" type="date" />
        </label>
        <button disabled={busy} type="submit">
          {busy ? '作成中…' : '作成'}
        </button>
        <p id="form-status" role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <table>
        <caption>有効な組織単位</caption>
        <thead>
          <tr>
            <th scope="col">コード</th>
            <th scope="col">名称</th>
            <th scope="col">版</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id}>
              <td>{unit.code}</td>
              <td>{unit.name}</td>
              <td>{unit.version}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
