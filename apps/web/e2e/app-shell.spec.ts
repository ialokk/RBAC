import { test, expect } from '@playwright/test';

// Smoke-level PWA/app-shell checks — no backend/auth required (docs/TESTING.md §E2E).
test.describe('App shell', () => {
  test('loads the SPA and links the web app manifest', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RBAC Food Delivery/);
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('manifest.webmanifest');
  });

  test('redirects an unauthenticated visitor away from a role-guarded area', async ({ page }) => {
    await page.goto('/customer');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('redirects an unauthenticated visitor away from the admin area', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/auth/);
  });
});
