'use client';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';

const employmentId = '10000000-0000-4000-8000-000000000003';
interface AttendanceRow {
  id: string;
  workDate: string;
  startedAt: string;
  endedAt: string;
  breakMinutes: number;
  workedMinutes: number;
  source: string;
  correctedEntryId: string | null;
  supersededById: string | null;
}
interface BreakDraft {
  readonly key: string;
}
function instant(local: string): string {
  return new Date(`${local}:00+09:00`).toISOString();
}
function minutes(value: number): string {
  return `${String(Math.floor(value / 60))}時間${String(value % 60)}分`;
}

export function AttendanceForm(): React.JSX.Element {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [breaks, setBreaks] = useState<BreakDraft[]>([]);
  const [message, setMessage] = useState('');
  const [correctedEntryId, setCorrectedEntryId] = useState<string>();
  const load = useCallback(async () => {
    const response = await fetch(`/api/commands/attendance?employmentId=${employmentId}&limit=100`);
    if (response.ok) setRows((await response.json()) as AttendanceRow[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string): string => {
      const value = data.get(name);
      return typeof value === 'string' ? value : '';
    };
    const response = await fetch('/api/commands/attendance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId,
        workDate: text('workDate'),
        startedAt: instant(`${text('workDate')}T${text('startTime')}`),
        endedAt: instant(`${text('endDate')}T${text('endTime')}`),
        timeZone: 'Asia/Tokyo',
        source: text('source'),
        correctedEntryId,
        breaks: breaks.map((item) => ({
          id: crypto.randomUUID(),
          startedAt: instant(text(`breakStart-${item.key}`)),
          endedAt: instant(text(`breakEnd-${item.key}`)),
        })),
      }),
    });
    if (response.ok) {
      setMessage(
        correctedEntryId === undefined ? '勤怠を記録しました。' : '訂正版を記録しました。',
      );
      setCorrectedEntryId(undefined);
      setBreaks([]);
      form.reset();
      await load();
    } else {
      const error = (await response.json()) as { message?: string };
      setMessage(error.message ?? '勤怠を記録できませんでした。');
    }
  }

  return (
    <section aria-labelledby="attendance-heading">
      <h2 id="attendance-heading">勤怠記録</h2>
      <p>時刻は日本時間です。実際の出退勤と休憩を入力してください。</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          勤務日
          <input required name="workDate" type="date" />
        </label>
        <label>
          開始時刻
          <input required name="startTime" type="time" step="60" />
        </label>
        <label>
          終了日
          <input required name="endDate" type="date" />
        </label>
        <label>
          終了時刻
          <input required name="endTime" type="time" step="60" />
        </label>
        <label>
          記録方法
          <select name="source" defaultValue="manual">
            <option value="manual">手入力</option>
            <option value="clock">打刻</option>
            <option value="import">取込</option>
          </select>
        </label>
        {correctedEntryId === undefined ? null : (
          <p>
            訂正対象: <code>{correctedEntryId}</code>{' '}
            <button
              type="button"
              onClick={() => {
                setCorrectedEntryId(undefined);
              }}
            >
              訂正を解除
            </button>
          </p>
        )}
        <fieldset>
          <legend>休憩（最大10件）</legend>
          {breaks.map((item, index) => (
            <div key={item.key}>
              <label>
                休憩{index + 1}開始
                <input required name={`breakStart-${item.key}`} type="datetime-local" step="60" />
              </label>
              <label>
                休憩{index + 1}終了
                <input required name={`breakEnd-${item.key}`} type="datetime-local" step="60" />
              </label>
              <button
                type="button"
                onClick={() => {
                  setBreaks((current) => current.filter((value) => value.key !== item.key));
                }}
              >
                休憩を削除
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={breaks.length >= 10}
            onClick={() => {
              setBreaks((current) => [...current, { key: crypto.randomUUID() }]);
            }}
          >
            休憩を追加
          </button>
        </fieldset>
        <button type="submit">
          {correctedEntryId === undefined ? '勤怠を記録' : '訂正版を記録'}
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <table>
        <caption>勤怠履歴</caption>
        <thead>
          <tr>
            <th scope="col">勤務日</th>
            <th scope="col">開始</th>
            <th scope="col">終了</th>
            <th scope="col">休憩</th>
            <th scope="col">実働</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.workDate}</td>
              <td>{new Date(row.startedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
              <td>{new Date(row.endedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
              <td>{minutes(row.breakMinutes)}</td>
              <td>{minutes(row.workedMinutes)}</td>
              <td>{row.supersededById === null ? '現在' : '訂正済み'}</td>
              <td>
                {row.supersededById === null ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCorrectedEntryId(row.id);
                    }}
                  >
                    訂正する
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
