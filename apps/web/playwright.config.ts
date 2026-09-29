import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

// End-to-end browser tests (docs/TESTING.md). Expects the Angular app already served (e.g. `ng
// serve`) at baseURL — does not manage the API/DB lifecycle itself (see docs/TESTING.md for the
// full stack required for the authenticated journeys).
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
