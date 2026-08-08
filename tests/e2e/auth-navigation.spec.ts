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
  await attendance.getByRole('button', { name: '9時間勤務を記録' }).click();
  await expect(attendance.getByRole('status')).toContainText('勤怠を記録しました');

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
});
