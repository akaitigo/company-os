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
