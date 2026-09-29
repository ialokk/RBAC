import { test } from '@playwright/test';

// Full authenticated journeys (customer checkout, restaurant order handling, delivery hand-off,
// admin permissions) per docs/TESTING.md §E2E. These are intentionally `.skip`ped rather than
// deleted or faked: driving them for real requires (a) the API + MongoDB running against seeded
// fixtures (an approved restaurant/menu/delivery partner — see apps/api/test/utils/seed.ts for the
// equivalent backend-side fixture) and (b) a way to read the OTP a real login sends, since this
// app deliberately never exposes the code to the client (docs/SECURITY.md §3). The backend
// integration suite (apps/api/test/integration/*.spec.ts) already exercises the exact same
// journeys against the real HTTP API without that constraint — these Playwright specs are the
// browser-level counterpart, ready to un-skip once a test-environment OTP-retrieval hook (e.g. a
// non-production-only endpoint, or reading the notification channel's captured payload) exists.

test.describe.skip('Customer checkout journey (browse -> cart -> checkout -> order placed)', () => {
  test('logs in via OTP, adds an item to cart, checks out with COD, and sees order confirmation', async () => {
    // 1. goto('/auth') -> request OTP for a seeded customer mobile number
    // 2. retrieve the OTP via the (not-yet-built) test hook, submit the verify form
    // 3. goto('/customer/restaurants/:id'), add a menu item to cart
    // 4. goto('/customer/checkout'), select a saved address + COD, submit
    // 5. assert redirect to /customer/orders/current showing status "Order placed"
  });
});

test.describe.skip('Restaurant order journey (accept -> prepare -> ready)', () => {
  test('an approved restaurant owner sees an incoming order and moves it through the workflow', async () => {
    // 1. log in as a seeded, APPROVED restaurant owner
    // 2. goto('/restaurant/orders'), find the incoming order, click Accept
    // 3. set prep time, click "Mark preparing", then "Mark ready"
    // 4. assert the order disappears from the "pending" tab and appears under "ready"
  });
});

test.describe.skip('Delivery journey (accept assignment -> pickup -> OTP hand-off -> delivered)', () => {
  test('an available delivery partner accepts an offer and completes the hand-off', async () => {
    // 1. log in as a seeded, APPROVED, AVAILABLE delivery partner
    // 2. goto('/delivery/dashboard'), accept the offered assignment
    // 3. mark arrived-at-restaurant, picked-up, arrived-at-customer
    // 4. enter the hand-off OTP (captured via the same test hook as the customer journey), mark delivered
  });
});

test.describe.skip('Admin permissions (dashboard, approvals, order/payment management)', () => {
  test('an ADMIN can reach every admin screen; a non-admin logged-in user cannot', async () => {
    // 1. log in as a seeded ADMIN, goto('/admin/dashboard'), assert counts render
    // 2. approve a pending restaurant application, assert it moves to the approved list
    // 3. log in as a CUSTOMER instead, goto('/admin/dashboard'), assert redirect/403 UI state
  });
});
