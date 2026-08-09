import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('packaged production server exposes static, health, and hardened CSP', async ({
  page,
  request,
}) => {
  const ready = await request.get('/api/health/ready');
  expect(ready.status()).toBe(200);
  await expect(ready.json()).resolves.toEqual({ status: 'ready', service: 'web' });
  const marker = await request.get('/company-os-mark.svg');
  expect(marker.status()).toBe(200);
  expect(await marker.text()).toContain('<svg');
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain('unsafe-eval');
});

async function login(page: Page, username: string): Promise<void> {
  const password = process.env['E2E_USER_PASSWORD'];
  expect(password).toBeTruthy();
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: 'Username or email' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test('unauthenticated console is keyboard accessible and redirects with PKCE', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: '会社運営の統制コンソール' }),
  ).toBeVisible();
  const login = page.getByRole('link', { name: 'ログイン' });
  await page.keyboard.press('Tab');
  await expect(login).toBeFocused();
  await login.click();
  await expect(page).toHaveURL(
    /localhost:8080\/realms\/company-os\/protocol\/openid-connect\/auth/,
  );
  const callback = new URL(page.url());
  expect(callback.searchParams.get('code_challenge_method')).toBe('S256');
  expect(callback.searchParams.get('state')).toBeTruthy();
  await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
});

test('public console has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});

test('authenticated administrator creates an audited organization command', async ({ page }) => {
  await login(page, 'e2e-user');
  await expect(page.getByRole('heading', { level: 2, name: '組織単位' })).toBeVisible();
  await page.getByLabel('コード').fill(`E2E_${Date.now().toString()}`);
  await page.getByLabel('名称').fill('E2E 統制部門');
  await page.getByLabel('適用開始日').fill('2026-08-09');
  await page.getByRole('button', { name: '作成' }).click();
  await expect(page.getByRole('status').filter({ hasText: '組織単位' })).toContainText(
    '組織単位を作成しました',
  );

  const attendance = page.getByRole('region', { name: '勤怠' });
  await attendance.getByLabel('勤務日').fill('2026-08-09');
  await attendance.getByLabel('開始時刻').fill('08:30');
  await attendance.getByLabel('終了日').fill('2026-08-09');
  await attendance.getByLabel('終了時刻').fill('18:15');
  await attendance.getByRole('button', { name: '休憩を追加' }).click();
  await attendance.getByLabel('休憩1開始').fill('2026-08-09T12:00');
  await attendance.getByLabel('休憩1終了').fill('2026-08-09T12:45');
  await attendance.getByRole('button', { name: '勤怠を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を記録しました');
  await expect(attendance.getByRole('table')).toContainText('9時間0分');
  await attendance.getByText('計算根拠').first().click();
  await expect(attendance.getByRole('table')).toContainText('DEMO_STANDARD v1');
  await expect(attendance.getByRole('table')).toContainText('日次法定時間外');
  await attendance.getByRole('button', { name: '訂正する' }).first().click();
  await attendance.getByLabel('勤務日').fill('2026-08-09');
  await attendance.getByLabel('開始時刻').fill('08:45');
  await attendance.getByLabel('終了日').fill('2026-08-09');
  await attendance.getByLabel('終了時刻').fill('18:15');
  await attendance.getByRole('button', { name: '訂正版を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('訂正版を記録しました');
  await expect(attendance.getByRole('table')).toContainText('訂正済み');
  await expect(attendance.getByRole('heading', { name: '月次締め' })).toHaveCount(0);

  await attendance.getByLabel('勤務日').fill('2027-01-09');
  await attendance.getByLabel('開始時刻').fill('09:00');
  await attendance.getByLabel('終了日').fill('2027-01-09');
  await attendance.getByLabel('終了時刻').fill('18:00');
  await attendance.getByRole('button', { name: '勤怠を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を記録しました');
  await attendance.getByRole('button', { name: '承認', exact: true }).first().click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を承認しました');
  await expect(attendance.getByRole('table')).toContainText('承認済み');

  await attendance.getByLabel('勤務日').fill('2027-02-09');
  await attendance.getByLabel('開始時刻').fill('09:00');
  await attendance.getByLabel('終了日').fill('2027-02-09');
  await attendance.getByLabel('終了時刻').fill('18:00');
  await attendance.getByRole('button', { name: '勤怠を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を記録しました');
  await attendance.getByRole('button', { name: '差戻し', exact: true }).first().click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を差し戻しました');
  await expect(attendance.getByRole('table')).toContainText('差戻し');

  const requisition = page.getByRole('region', { name: '購買申請' });
  await requisition.getByLabel('目的').fill('E2E業務機器更新');
  await requisition.getByLabel('品目').fill('架空ノートPC');
  await requisition.getByLabel('見積額（JPY）').fill('120000');
  await requisition.getByRole('button', { name: '申請' }).click();
  await expect(requisition.getByRole('status')).toContainText('購買申請を提出しました');

  const journal = page.getByRole('region', { name: '仕訳' });
  await journal.getByLabel('会計日').fill('2026-08-09');
  await journal.getByLabel('金額（JPY）').fill('120000');
  await journal.getByRole('button', { name: '転記' }).click();
  await expect(journal.getByRole('status')).toContainText('仕訳を転記しました');

  const authenticatedAccessibility = await new AxeBuilder({ page }).analyze();
  expect(
    authenticatedAccessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);

  const commandResult = await page.evaluate(async () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const post = async (command: string, body: Record<string, unknown>) => {
      const response = await fetch(`/api/commands/${command}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.status;
    };
    const leave = await post('leave', {
      id: crypto.randomUUID(),
      tenantId,
      employmentId: '10000000-0000-4000-8000-000000000003',
      leaveType: 'annual',
      startsOn: '2026-08-10',
      endsOn: '2026-08-10',
      requestedMinutes: 60,
    });
    const inaccessibleLeave = await post('leave', {
      id: crypto.randomUUID(),
      tenantId,
      employmentId: '10000000-0000-4000-8000-000000000013',
      leaveType: 'annual',
      startsOn: '2026-08-10',
      endsOn: '2026-08-10',
      requestedMinutes: 60,
    });
    const rejectedAttendance = await post('attendance', {
      id: crypto.randomUUID(),
      tenantId,
      employmentId: '10000000-0000-4000-8000-000000000003',
      workDate: '2026-08-09',
      startedAt: '2026-08-09T00:00:00Z',
      endedAt: '2026-08-09T09:00:00Z',
      timeZone: 'Asia/Tokyo',
      source: 'manual',
      breaks: [
        {
          id: crypto.randomUUID(),
          startedAt: '2026-08-09T03:00:00Z',
          endedAt: '2026-08-09T04:00:00Z',
        },
        {
          id: crypto.randomUUID(),
          startedAt: '2026-08-09T03:30:00Z',
          endedAt: '2026-08-09T04:30:00Z',
        },
      ],
    });
    const inaccessibleAttendance = await post('attendance', {
      id: crypto.randomUUID(),
      tenantId,
      employmentId: '10000000-0000-4000-8000-000000000013',
      workDate: '2026-08-09',
      startedAt: '2026-08-09T00:00:00Z',
      endedAt: '2026-08-09T09:00:00Z',
      timeZone: 'Asia/Tokyo',
      source: 'manual',
      breaks: [],
    });
    const receipt = await post('receipt', {
      id: crypto.randomUUID(),
      tenantId,
      receivableId: '10000000-0000-4000-8000-000000000008',
      customerPartyId: '10000000-0000-4000-8000-000000000007',
      receivedOn: '2026-08-09',
      currency: 'JPY',
      amount: 100,
      externalReference: `E2E-${crypto.randomUUID()}`,
    });
    const allocationJournalId = crypto.randomUUID();
    const allocationJournal = await post('journal', {
      id: allocationJournalId,
      tenantId,
      accountingDate: '2026-08-09',
      currency: 'JPY',
      sourceType: 'e2e-allocation',
      sourceId: crypto.randomUUID(),
      lines: [
        {
          accountId: '10000000-0000-4000-8000-000000000004',
          debit: 1000,
          credit: 0,
        },
        {
          accountId: '10000000-0000-4000-8000-000000000005',
          debit: 0,
          credit: 1000,
        },
      ],
    });
    const allocation = await post('allocation', {
      id: crypto.randomUUID(),
      tenantId,
      journalId: allocationJournalId,
      sourceCostCenterId: '10000000-0000-4000-8000-000000000010',
      targetCostCenterId: '10000000-0000-4000-8000-000000000011',
      amount: 100,
      currency: 'JPY',
      ruleId: 'RULE-COST-DEMO',
      ruleVersion: 1,
    });
    const rejectedAllocation = await post('allocation', {
      id: crypto.randomUUID(),
      tenantId,
      journalId: allocationJournalId,
      sourceCostCenterId: '10000000-0000-4000-8000-000000000010',
      targetCostCenterId: '10000000-0000-4000-8000-000000000011',
      amount: 100,
      currency: 'USD',
      ruleId: 'RULE-COST-DEMO',
      ruleVersion: 1,
    });
    return {
      leave,
      inaccessibleLeave,
      rejectedAttendance,
      inaccessibleAttendance,
      receipt,
      allocationJournal,
      allocation,
      rejectedAllocation,
    };
  });
  expect(commandResult).toEqual({
    leave: 201,
    inaccessibleLeave: 403,
    rejectedAttendance: 422,
    inaccessibleAttendance: 403,
    receipt: 201,
    allocationJournal: 201,
    allocation: 201,
    rejectedAllocation: 422,
  });
  await page.getByRole('link', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
});

test('HR closes and reopens an approved attendance month', async ({ page }) => {
  await login(page, 'hr-e2e');
  const workRules = page.getByRole('region', { name: '勤務ルール・カレンダー' });
  await expect(workRules).toContainText('DEMO_STANDARD v1');
  await workRules.getByLabel('対象日').fill('2027-01-10');
  await workRules.getByLabel('区分').selectOption('statutory_holiday');
  await workRules.getByLabel('理由').fill('E2E法定休日設定');
  await workRules.getByRole('button', { name: 'カレンダーへ追加' }).click();
  await expect(workRules.getByRole('status')).toContainText('勤務カレンダーへ履歴を追加しました');
  const attendance = page.getByRole('region', { name: '勤怠' });
  await expect(attendance.getByRole('heading', { name: '月次締め' })).toBeVisible();
  await attendance.getByLabel('締め対象月').fill('2027-01');
  await attendance.getByRole('button', { name: '勤怠月を締める' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠月を締めました');

  const closedStatus = await page.evaluate(async () => {
    const response = await fetch('/api/commands/attendance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId: '10000000-0000-4000-8000-000000000003',
        workDate: '2027-01-10',
        startedAt: '2027-01-10T00:00:00Z',
        endedAt: '2027-01-10T09:00:00Z',
        timeZone: 'Asia/Tokyo',
        source: 'manual',
        breaks: [],
      }),
    });
    return response.status;
  });
  expect(closedStatus).toBe(409);
  await attendance.getByRole('button', { name: '勤怠月を再オープン' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠月を再オープンしました');
});

test('employee cannot review or close attendance', async ({ page }) => {
  await login(page, 'employee-e2e');
  const attendance = page.getByRole('region', { name: '勤怠' });
  await expect(attendance.getByRole('button', { name: '承認', exact: true })).toHaveCount(0);
  await expect(attendance.getByRole('heading', { name: '月次締め' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '勤務ルール・カレンダー' })).toHaveCount(0);
  const deniedStatus = await page.evaluate(async () => {
    const response = await fetch('/api/commands/attendance-decisions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId: '10000000-0000-4000-8000-000000000003',
        attendanceEntryId: crypto.randomUUID(),
        decision: 'approved',
        reason: 'unauthorized attempt',
      }),
    });
    return response.status;
  });
  expect(deniedStatus).toBe(403);
});

test('manager role cannot review through an employee-only access grant', async ({ page }) => {
  await login(page, 'manager-employee-e2e');
  const deniedStatus = await page.evaluate(async () => {
    const response = await fetch('/api/commands/attendance-decisions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        employmentId: '10000000-0000-4000-8000-000000000003',
        attendanceEntryId: crypto.randomUUID(),
        decision: 'approved',
        reason: 'must not use employee access as manager access',
      }),
    });
    return response.status;
  });
  expect(deniedStatus).toBe(403);
});
