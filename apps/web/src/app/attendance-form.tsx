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
  decision: 'approved' | 'rejected' | null;
  decisionReason: string | null;
  periodClosed: boolean;
  calculationInputHash: string | null;
  classification: {
    schemaVersion: 1;
    scheduledMinutes: number;
    outsideScheduleMinutes: number;
    statutoryOvertimeMinutes: number;
    nightMinutes: number;
    statutoryHolidayMinutes: number;
    rule: {
      code: string;
      version: number;
      requirementId: string;
      expertReviewStatus: 'approved';
    };
  } | null;
}
interface PeriodRow {
  id: string;
  periodMonth: string;
  sequence: number;
  action: 'close' | 'reopen';
  reason: string;
  occurredAt: string;
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
function actionableError(message: string | undefined, fallback: string): string {
  const translations: Readonly<Record<string, string>> = {
    'attendance period has unresolved entries':
      '未承認または差戻し中の勤怠があります。解決してから締めてください。',
    'attendance period is closed': '対象月は締め済みです。HRが再オープンしてから操作してください。',
    'attendance entry is already decided':
      'この勤怠は既に決定されています。履歴を再読込してください。',
    'attendance decision target is unavailable':
      '訂正済みまたは存在しない勤怠です。履歴を再読込してください。',
  };
  return message === undefined ? fallback : (translations[message] ?? message);
}

export function AttendanceForm({
  canReview,
  canManagePeriods,
}: Readonly<{ canReview: boolean; canManagePeriods: boolean }>): React.JSX.Element {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [breaks, setBreaks] = useState<BreakDraft[]>([]);
  const [message, setMessage] = useState('');
  const [correctedEntryId, setCorrectedEntryId] = useState<string>();
  const [reviewReason, setReviewReason] = useState('内容を確認しました');
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodReason, setPeriodReason] = useState('月次勤怠を確認しました');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const attendanceRequest = fetch(
        `/api/commands/attendance?employmentId=${employmentId}&limit=100`,
      );
      const periodRequest = canManagePeriods
        ? fetch(`/api/commands/attendance-periods?employmentId=${employmentId}&limit=100`)
        : Promise.resolve(undefined);
      const [attendanceResponse, periodResponse] = await Promise.all([
        attendanceRequest,
        periodRequest,
      ]);
      if (attendanceResponse.ok) setRows((await attendanceResponse.json()) as AttendanceRow[]);
      if (periodResponse?.ok === true) setPeriods((await periodResponse.json()) as PeriodRow[]);
      if (!attendanceResponse.ok || periodResponse?.ok === false)
        setMessage('勤怠履歴を取得できませんでした。権限と接続を確認して再試行してください。');
    } catch {
      setMessage('勤怠履歴を取得できませんでした。接続を確認して再試行してください。');
    } finally {
      setLoading(false);
    }
  }, [canManagePeriods]);
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
      setMessage(actionableError(error.message, '勤怠を記録できませんでした。'));
    }
  }

  async function decide(row: AttendanceRow, decision: 'approved' | 'rejected'): Promise<void> {
    const response = await fetch('/api/commands/attendance-decisions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId,
        attendanceEntryId: row.id,
        decision,
        reason: reviewReason,
      }),
    });
    if (response.ok) {
      setMessage(decision === 'approved' ? '勤怠を承認しました。' : '勤怠を差し戻しました。');
      await load();
    } else {
      const error = (await response.json()) as { message?: string };
      setMessage(actionableError(error.message, '勤怠を決定できませんでした。'));
    }
  }

  async function transitionPeriod(action: 'close' | 'reopen'): Promise<void> {
    const response = await fetch('/api/commands/attendance-periods', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId,
        periodMonth: `${periodMonth}-01`,
        action,
        reason: periodReason,
      }),
    });
    if (response.ok) {
      setMessage(action === 'close' ? '勤怠月を締めました。' : '勤怠月を再オープンしました。');
      await load();
    } else {
      const error = (await response.json()) as { message?: string };
      setMessage(actionableError(error.message, '勤怠月を変更できませんでした。'));
    }
  }

  const periodState = periods.find((period) => period.periodMonth.slice(0, 7) === periodMonth);

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
        <button type="button" onClick={() => void load()}>
          履歴を再読込
        </button>
      </form>
      {canManagePeriods ? (
        <form
          aria-label="勤怠月次締め"
          onSubmit={(event) => {
            event.preventDefault();
            void transitionPeriod(periodState?.action === 'close' ? 'reopen' : 'close');
          }}
        >
          <h3>月次締め</h3>
          <p>これは運用上の確定です。給与・法令計算の完了を示すものではありません。</p>
          <label>
            対象月
            <input
              required
              aria-label="締め対象月"
              type="month"
              value={periodMonth}
              onChange={(event) => {
                setPeriodMonth(event.target.value);
              }}
            />
          </label>
          <label>
            締め・再オープン理由
            <input
              required
              maxLength={500}
              value={periodReason}
              onChange={(event) => {
                setPeriodReason(event.target.value);
              }}
            />
          </label>
          <button type="submit">
            {periodState?.action === 'close' ? '勤怠月を再オープン' : '勤怠月を締める'}
          </button>
          <h4>締め・再オープン履歴</h4>
          {periods.length === 0 ? (
            <p>履歴はありません。</p>
          ) : (
            <ol>
              {periods.map((period) => (
                <li key={period.id}>
                  {period.periodMonth.slice(0, 7)}:{' '}
                  {period.action === 'close' ? '締め' : '再オープン'}（{period.reason}、
                  {new Date(period.occurredAt).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                  })}
                  ）
                </li>
              ))}
            </ol>
          )}
        </form>
      ) : null}
      {canReview ? (
        <label>
          承認・差戻し理由
          <input
            maxLength={500}
            value={reviewReason}
            onChange={(event) => {
              setReviewReason(event.target.value);
            }}
          />
        </label>
      ) : null}
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
          {loading ? (
            <tr>
              <td colSpan={7}>勤怠履歴を読み込んでいます。</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7}>勤怠履歴はありません。</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.workDate}</td>
              <td>{new Date(row.startedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
              <td>{new Date(row.endedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
              <td>{minutes(row.breakMinutes)}</td>
              <td>
                {minutes(row.workedMinutes)}
                {row.classification === null ? (
                  <small>（旧記録・未分類）</small>
                ) : (
                  <details>
                    <summary>計算根拠</summary>
                    <dl>
                      <dt>勤務ルール</dt>
                      <dd>
                        {row.classification.rule.code} v{row.classification.rule.version}
                        （専門家確認: 承認済み）
                      </dd>
                      <dt>所定内</dt>
                      <dd>{minutes(row.classification.scheduledMinutes)}</dd>
                      <dt>所定外</dt>
                      <dd>{minutes(row.classification.outsideScheduleMinutes)}</dd>
                      <dt>日次法定時間外</dt>
                      <dd>{minutes(row.classification.statutoryOvertimeMinutes)}</dd>
                      <dt>深夜</dt>
                      <dd>{minutes(row.classification.nightMinutes)}</dd>
                      <dt>法定休日</dt>
                      <dd>{minutes(row.classification.statutoryHolidayMinutes)}</dd>
                      <dt>根拠要件</dt>
                      <dd>{row.classification.rule.requirementId}</dd>
                    </dl>
                    <small>計算識別子: {row.calculationInputHash?.slice(0, 12)}</small>
                    <p>月次・年次の時間外上限や給与額は、この内訳では判定していません。</p>
                  </details>
                )}
              </td>
              <td>
                {row.supersededById !== null
                  ? '訂正済み'
                  : row.decision === 'approved'
                    ? row.periodClosed
                      ? '承認済み・締め済み'
                      : '承認済み'
                    : row.decision === 'rejected'
                      ? '差戻し'
                      : row.periodClosed
                        ? '締め済み'
                        : '承認待ち'}
                {row.decisionReason === null ? null : <small> 理由: {row.decisionReason}</small>}
              </td>
              <td>
                {row.supersededById === null && row.decision !== 'approved' && !row.periodClosed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCorrectedEntryId(row.id);
                    }}
                  >
                    訂正する
                  </button>
                ) : null}
                {canReview &&
                row.supersededById === null &&
                row.decision === null &&
                !row.periodClosed ? (
                  <>
                    <button
                      type="button"
                      disabled={reviewReason.trim().length === 0}
                      onClick={() => void decide(row, 'approved')}
                    >
                      承認
                    </button>
                    <button
                      type="button"
                      disabled={reviewReason.trim().length === 0}
                      onClick={() => void decide(row, 'rejected')}
                    >
                      差戻し
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
