import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
  const password = process.env['E2E_USER_PASSWORD'];
  expect(password).toBeTruthy();
  await page.goto('/auth/login');
  await page.getByRole('textbox', { name: 'Username or email' }).fill('e2e-user');
  await page.getByRole('textbox', { name: 'Password' }).fill(password ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();
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
  await attendance.getByRole('button', { name: '訂正する' }).first().click();
  await attendance.getByLabel('勤務日').fill('2026-08-09');
  await attendance.getByLabel('開始時刻').fill('08:45');
  await attendance.getByLabel('終了日').fill('2026-08-09');
  await attendance.getByLabel('終了時刻').fill('18:15');
  await attendance.getByRole('button', { name: '訂正版を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('訂正版を記録しました');
  await expect(attendance.getByRole('table')).toContainText('訂正済み');

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
    const allocation = await post('allocation', {
      id: crypto.randomUUID(),
      tenantId,
      journalId: '10000000-0000-4000-8000-000000000009',
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
      journalId: '10000000-0000-4000-8000-000000000009',
      sourceCostCenterId: '10000000-0000-4000-8000-000000000010',
      targetCostCenterId: '10000000-0000-4000-8000-000000000011',
      amount: 100,
      currency: 'USD',
      ruleId: 'RULE-COST-DEMO',
      ruleVersion: 1,
    });
    return {
      leave,
      rejectedAttendance,
      inaccessibleAttendance,
      receipt,
      allocation,
      rejectedAllocation,
    };
  });
  expect(commandResult).toEqual({
    leave: 201,
    rejectedAttendance: 422,
    inaccessibleAttendance: 403,
    receipt: 201,
    allocation: 201,
    rejectedAllocation: 422,
  });
});
