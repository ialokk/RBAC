# Testing Strategy (Phase 12)

Version 1 testing stack: **Jest + ts-jest + supertest + mongodb-memory-server** (backend), **Vitest via `@angular/build:unit-test`** (frontend unit), **Playwright** (browser e2e). No new backend infrastructure — `mongodb-memory-server` runs an ephemeral, in-process MongoDB per test file; nothing is added to the running application stack.

## 1. Running the tests

```bash
# Backend: unit + integration (Jest, real Express app + in-memory MongoDB)
npm run test:api

# Frontend: unit tests (Vitest via the Angular CLI)
npm run test:web

# Both
npm run test

# Browser e2e (requires the app served, e.g. `npm run dev:web` in another terminal)
npm run test:e2e --workspace apps/web
```

## 2. Backend (`apps/api/test/`)

- `test/utils/test-env.ts` — Jest `setupFiles` entry; sets required env vars (`JWT_*`, `RAZORPAY_*`, a placeholder `MONGODB_URI`) before `config/env.ts`'s fail-fast Zod parse runs.
- `test/utils/db.ts` — `setupTestDb()`/`teardownTestDb()`/`clearTestDb()`. Starts a fresh `MongoMemoryServer` per test file and points Mongoose's process-wide connection at it directly (bypasses `env.MONGODB_URI`/`connectToDatabase()` entirely, sidestepping the "env parsed once at import time" ordering problem).
- `test/utils/auth.ts` — `createTestUser(role, options)` creates a real `User` document and signs a real, valid access token via the actual `signAccessToken` util (never a hand-rolled fake token).
- `test/utils/seed.ts` — `seedCheckoutFixture(customerId, restaurantOwnerId)` creates an APPROVED restaurant + menu item + customer address + a cart with that item, ready to check out.

| File | Covers |
|---|---|
| `test/unit/razorpay-signature.spec.ts` | Pure HMAC signature verification (payment + webhook) — no DB, no network. |
| `test/unit/permissions.spec.ts` | `hasPermission()` role/permission matrix spot-checks (docs/ROLE-PERMISSIONS.md §3). |
| `test/unit/pricing.spec.ts` | `computePricing()` against the DB-backed platform config (Phase 9). |
| `test/integration/auth.spec.ts` | OTP request → verify → JWT issuance; wrong code; expired/never-requested; strict-schema rejection of extra fields. |
| `test/integration/authorization.spec.ts` | 401 with no token; 403 across CUSTOMER/RESTAURANT/DELIVERY_PARTNER on admin routes; ADMIN success; suspended-account rejection even with a valid JWT. |
| `test/integration/order-lifecycle.spec.ts` | COD order creation → restaurant accept/preparing/ready; invalid-transition 409; customer cancellation auto-chaining to `REFUND_PENDING`; cross-restaurant ownership rejection. |
| `test/integration/payment-webhook.spec.ts` | Signature verification, payment transition to `SUCCESS` + order transition to `RESTAURANT_PENDING` (post-Phase-13 fix — was `PAID` before the payment/order integration bug was fixed), invalid-signature rejection, and exact-redelivery idempotency (`webhookEventIds`). |
| `test/integration/delivery-journey.spec.ts` | Full assignment lifecycle: offer → accept → arrived → picked-up (OTP generated) → arrived-customer → OTP verify (wrong code rejected) → delivered → order reads `DELIVERED`. |

### Why webhook/payment-gateway network calls are bypassed, not mocked-and-forgotten
This environment has no real Razorpay credentials, so `paymentsService.initiate()` (which calls the live `orders.create` API) cannot be exercised end-to-end here. The webhook test instead seeds the `Payment` document `initiate()` would have produced and drives the actual `handleWebhook()` code path — the part that matters most for correctness (signature verification + idempotency + order transition) is fully real; only the outbound HTTP call to Razorpay itself is out of reach in this sandbox.

## 3. Frontend (`apps/web/src/**/*.spec.ts`)

- `app.spec.ts` — fixed a real bug this phase surfaced: the default scaffolded test didn't provide `SwUpdate` (Phase 11's `PwaUpdateService` now injects it via the root `App` component), and asserted stale "Hello, web" content. Now provides a disabled service worker and asserts the router outlet renders.
- `core/auth/auth.service.spec.ts` — `verifyOtp` stores tokens/sets `currentUser` via `HttpTestingController`; `homePathForRole` mapping.
- `core/auth/guards/role.guard.spec.ts` — allows/redirects based on the current role.

## 4. End-to-end browser tests (`apps/web/e2e/`, Playwright)

- `e2e/app-shell.spec.ts` — app loads, manifest is linked, unauthenticated visitors are redirected away from `/customer` and `/admin`.
- `e2e/auth-login.spec.ts` — OTP request form validation/channel switching (real rendered Angular form).
- `e2e/authenticated-journeys.spec.ts` — **`test.describe.skip`** scaffolds for the customer checkout, restaurant order, delivery hand-off, and admin-permissions journeys, with step-by-step comments. Not executable yet: driving a real login needs a way to read the OTP a live server "sends" (deliberately never returned to the client, docs/SECURITY.md §3), which needs a test-only backdoor that doesn't exist yet. The equivalent journeys ARE fully covered, executably, by the backend integration suite (`order-lifecycle.spec.ts`, `delivery-journey.spec.ts`, `authorization.spec.ts`) via real HTTP calls against the real service layer — just without a browser in the loop.

### Known environment limitation — Playwright browser binary could not be downloaded here
`npx playwright install chromium` fails in this sandbox: `Error: unable to get local issuer certificate` connecting to `cdn.playwright.dev` (the same class of TLS trust-store issue that blocked the Android Gradle wrapper download in Phase 11 — this machine's proxy/cert chain doesn't validate for these specific non-npm CDN domains, even though the npm registry itself is reachable). The two non-skipped specs (`app-shell`, `auth-login`) are real, ready-to-run Playwright tests — verified they at least reach "browser not found" (i.e. Playwright itself, the config, and the specs are wired correctly) rather than failing for an unrelated reason. Run `npx playwright install chromium && npx playwright test` on a machine/CI with normal internet access to execute them.

## 5. Bugs found and fixed by writing these tests

- **Geo sub-document auto-vivification crash** (`address.model.ts`, `restaurant.model.ts`, `delivery-partner.model.ts`, `restaurant-application.model.ts`): the optional `geo` field's nested `type` subfield had `default: 'Point'`, which made Mongoose auto-vivify `geo: { type: 'Point' }` (missing `coordinates`) even when `geo` was never set at all. Once each collection's `2dsphere` index finished building (a background, timing-dependent step — hence this wasn't caught by earlier phases' manual smoke-testing), any insert without explicit coordinates crashed with `Can't extract geo keys`. Removed the stray default; `geo` is now correctly left `undefined` when omitted. **This was a real, pre-existing latent bug reachable in production** (e.g. any address created without lat/lng), not a test-only artifact — fixed as part of "fix failures" for this phase, not an architecture change.
- Stale default frontend test (`app.spec.ts`) asserting removed "Hello, web" placeholder content, and missing `SwUpdate`/router providers now required by the root `App` component (Phase 11 additions) — fixed to reflect the current app shell.
- `app.ts` now suppresses `morgan` request logging when `NODE_ENV === 'test'` (pure noise-reduction for test output, no behavioral change to dev/production).

## 6. Known gaps from this phase — since resolved

- ~~An online-paid (non-COD) order stays at `PAID` after the payment webhook/verify confirms it~~ — **fixed in the Post-Phase-13 integration pass**: `orders.service.ts`'s `markPaid()` now chains straight through to `RESTAURANT_PENDING` (mirrors the COD branch of `createFromCart`), so an online-paid order becomes visible to the restaurant immediately, the same way a COD order always did. `test/integration/payment-webhook.spec.ts` was updated to assert the corrected behavior (`RESTAURANT_PENDING`, not `PAID`). See `TASKS.md`'s "Post-Phase-13 Integration" section for the full record of this fix.
- No other known gaps remain open from this phase as of the Post-Phase-13 documentation-consistency audit.
