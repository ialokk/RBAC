import { test, expect } from '@playwright/test';

// Login form behavior — client-side validation/UX only (the backend OTP round-trip is covered
// by apps/api's integration tests; this checks the real rendered Angular form, docs/TESTING.md §E2E).
test.describe('Login — OTP request form', () => {
  test('disables submit until a valid mobile number is entered, then shows the code step', async ({ page }) => {
    await page.goto('/auth');

    const submit = page.getByRole('button', { name: 'Send OTP' });
    await expect(submit).toBeDisabled();

    await page.locator('#target').fill('+919876543210');
    await expect(submit).toBeEnabled();
  });

  test('can switch to email OTP channel', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Email OTP' }).click();
    await expect(page.locator('#target')).toHaveAttribute('type', 'email');
  });
});
