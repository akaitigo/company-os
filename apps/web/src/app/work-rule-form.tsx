'use client';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';

const employmentId = '10000000-0000-4000-8000-000000000003';
interface WorkRuleRow {
  id: string;
  ruleCode: string;
  version: number;
  effectiveFrom: string;
  scheduledStartMinute: number;
  scheduledEndMinute: number;
  expertReviewStatus: 'pending' | 'approved' | 'rejected';
  definitionHash: string;
}
function minuteOfDay(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}
function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function WorkRuleForm(): React.JSX.Element {
  const [rules, setRules] = useState<WorkRuleRow[]>([]);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/commands/work-rules?limit=100');
    if (response.ok) setRules((await response.json()) as WorkRuleRow[]);
  }, []);
  useEffect(() => void load(), [load]);

  async function createRule(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string): string => formText(data, name);
    const response = await fetch('/api/commands/work-rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        ruleCode: text('ruleCode'),
        version: Number(text('version')),
        effectiveFrom: text('effectiveFrom'),
        timeZone: 'Asia/Tokyo',
        scheduledStartMinute: minuteOfDay(text('scheduledStart')),
        scheduledEndMinute: minuteOfDay(text('scheduledEnd')),
        statutoryDailyMinutes: Number(text('statutoryDailyMinutes')),
        nightStartMinute: minuteOfDay(text('nightStart')),
        nightEndMinute: minuteOfDay(text('nightEnd')),
        statutoryHolidayWeekdays: [Number(text('statutoryHolidayWeekday'))],
        requirementId: text('requirementId'),
        controlId: text('controlId'),
        expertReviewStatus: text('expertReviewStatus'),
      }),
    });
    setMessage(response.ok ? '勤務ルール版を登録しました。' : '勤務ルールを登録できませんでした。');
    if (response.ok) await load();
  }

  async function assignRule(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/commands/work-rule-assignments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId,
        workRuleVersionId: formText(data, 'workRuleVersionId'),
        effectiveFrom: formText(data, 'effectiveFrom'),
      }),
    });
    const error = response.ok ? undefined : ((await response.json()) as { message?: string });
    setMessage(
      response.ok
        ? '勤務ルールを配属へ適用しました。'
        : (error?.message ?? '適用できませんでした。'),
    );
  }

  async function setCalendarDay(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/commands/employment-calendar-days', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId,
        workDate: formText(data, 'workDate'),
        dayType: formText(data, 'dayType'),
        reason: formText(data, 'reason'),
      }),
    });
    setMessage(
      response.ok ? '勤務カレンダーへ履歴を追加しました。' : 'カレンダーを設定できませんでした。',
    );
  }

  async function activateEnforcement(): Promise<void> {
    const response = await fetch('/api/commands/working-time-enforcement', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const error = response.ok ? undefined : ((await response.json()) as { message?: string });
    setMessage(
      response.ok
        ? '勤務時間分類を必須化しました。未割当の勤怠は保存されません。'
        : (error?.message ?? '必須化できませんでした。'),
    );
  }

  return (
    <section aria-labelledby="work-rule-heading">
      <h2 id="work-rule-heading">勤務ルール・カレンダー</h2>
      <p>設定は版として保存されます。承認済みは専門家確認を終えたルールだけ選択してください。</p>
      <form onSubmit={(event) => void createRule(event)}>
        <h3>勤務ルール版を登録</h3>
        <label>
          ルールコード
          <input required name="ruleCode" pattern="[A-Z0-9_-]+" defaultValue="STANDARD" />
        </label>
        <label>
          版<input required name="version" type="number" min="1" defaultValue="1" />
        </label>
        <label>
          適用開始日
          <input required name="effectiveFrom" type="date" />
        </label>
        <label>
          所定開始
          <input required name="scheduledStart" type="time" defaultValue="09:00" />
        </label>
        <label>
          所定終了
          <input required name="scheduledEnd" type="time" defaultValue="18:00" />
        </label>
        <label>
          日次法定時間（分）
          <input
            required
            name="statutoryDailyMinutes"
            type="number"
            min="1"
            max="1440"
            defaultValue="480"
          />
        </label>
        <label>
          深夜開始
          <input required name="nightStart" type="time" defaultValue="22:00" />
        </label>
        <label>
          深夜終了
          <input required name="nightEnd" type="time" defaultValue="05:00" />
        </label>
        <label>
          法定休日の曜日
          <select name="statutoryHolidayWeekday" defaultValue="0">
            <option value="0">日曜</option>
            <option value="6">土曜</option>
          </select>
        </label>
        <label>
          要件ID
          <input required name="requirementId" defaultValue="JP-LABOR-003" />
        </label>
        <label>
          統制ID
          <input required name="controlId" defaultValue="CTL-LABOR-OVERTIME-001" />
        </label>
        <label>
          専門家確認
          <select name="expertReviewStatus" defaultValue="pending">
            <option value="pending">確認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </label>
        <button type="submit">版を登録</button>
      </form>
      <form onSubmit={(event) => void assignRule(event)}>
        <h3>配属へ適用</h3>
        <label>
          承認済みルール
          <select required name="workRuleVersionId" defaultValue="">
            <option value="" disabled>
              選択してください
            </option>
            {rules
              .filter((rule) => rule.expertReviewStatus === 'approved')
              .map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.ruleCode} v{rule.version}
                </option>
              ))}
          </select>
        </label>
        <label>
          適用開始日
          <input required name="effectiveFrom" type="date" />
        </label>
        <button type="submit">配属へ適用</button>
      </form>
      <form onSubmit={(event) => void setCalendarDay(event)}>
        <h3>勤務カレンダー履歴を追加</h3>
        <label>
          対象日
          <input required name="workDate" type="date" />
        </label>
        <label>
          区分
          <select name="dayType">
            <option value="working">勤務日</option>
            <option value="non_working">非勤務日</option>
            <option value="statutory_holiday">法定休日</option>
          </select>
        </label>
        <label>
          理由
          <input required maxLength={200} name="reason" />
        </label>
        <button type="submit">カレンダーへ追加</button>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <h3>移行完了</h3>
      <p>
        全在籍者へ承認済みルールを割り当てた後、分類を必須化してください。この操作は解除できません。
      </p>
      <button type="button" onClick={() => void activateEnforcement()}>
        勤務時間分類を必須化
      </button>
      <h3>登録済みルール</h3>
      <ul>
        {rules.map((rule) => (
          <li key={rule.id}>
            {rule.ruleCode} v{rule.version} / {rule.expertReviewStatus} / {rule.effectiveFrom} /
            hash {rule.definitionHash.slice(0, 12)}
          </li>
        ))}
      </ul>
    </section>
  );
}
