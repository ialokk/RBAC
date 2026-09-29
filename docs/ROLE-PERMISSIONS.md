# Role & Permission Matrix

## 1. Model

- **Role**: coarse-grained identity — `CUSTOMER`, `RESTAURANT`, `DELIVERY_PARTNER`, `ADMIN` (single primary role per user account; a restaurant staff account is always `RESTAURANT`, etc.).
- **Permission**: fine-grained action string `resource:action`, derived from role at login time and embedded in the JWT as a claim, but **re-validated against the DB on every sensitive request** (permissions are not solely trusted from the token for high-risk actions like refunds/approvals).
- Enforcement order per request: `authenticate` middleware (verifies JWT) → `requireRole(...)` middleware (coarse) → `requirePermission(...)` middleware (fine-grained) → controller/service business rule checks (e.g., "is this restaurant order actually owned by this restaurantId").

## 2. Roles

| Role | Description | Account state gate |
|---|---|---|
| CUSTOMER | Default role on signup via OTP | Active immediately |
| RESTAURANT | Restaurant owner/staff | Must be `APPROVED` via `restaurantApplications` before dashboard access |
| DELIVERY_PARTNER | Delivery rider | Must be `APPROVED` before receiving assignments |
| ADMIN | Platform operator | Provisioned manually, never via public signup |

## 3. Permission Matrix

Legend: ✅ allowed, ❌ not allowed, 🟡 conditional (see notes).

| Permission | CUSTOMER | RESTAURANT | DELIVERY_PARTNER | ADMIN |
|---|---|---|---|---|
| auth:login-otp | ✅ | ✅ | ✅ | ✅ |
| auth:manage-own-sessions | ✅ | ✅ | ✅ | ✅ |
| profile:read-own | ✅ | ✅ | ✅ | ✅ |
| profile:update-own | ✅ | ✅ | ✅ | ✅ |
| restaurant:apply | ✅ (own application, before promotion — applicant is still CUSTOMER when applying) | ❌ (already a restaurant; re-applying is not a thing) | ❌ | ❌ |
| restaurant:read-public | ✅ | ✅ | ✅ | ✅ |
| restaurant:manage-own | ❌ | 🟡 only own `restaurantId`, only if `APPROVED` | ❌ | ✅ any |
| menu:manage-own | ❌ | 🟡 own restaurant only | ❌ | ✅ any |
| cart:manage-own | ✅ | ❌ | ❌ | ❌ |
| order:create | ✅ | ❌ | ❌ | ❌ |
| order:read-own | ✅ own orders | 🟡 orders for own restaurant | 🟡 assigned orders | ✅ all |
| order:accept-reject (restaurant) | ❌ | 🟡 own restaurant order only | ❌ | ✅ |
| order:cancel-own (customer) | 🟡 only allowed states, per cancellation rules | ❌ | ❌ | ✅ any |
| order:cancel-admin | ❌ | ❌ | ❌ | ✅ |
| order:reassign-delivery | ❌ | ❌ | ❌ | ✅ |
| delivery:apply | ✅ (own application, before promotion — applicant is still CUSTOMER when applying, same pattern as `restaurant:apply`) | ❌ | ❌ (already a delivery partner) | ❌ |
| delivery:manage-own-status | ❌ | ❌ | 🟡 only if `APPROVED` | ❌ (permission exists server-side, but `/delivery/me/availability` is hard-gated to `DELIVERY_PARTNER`; no admin-facing route uses it in V1) |
| delivery:assignment-accept-decline | ❌ | ❌ | 🟡 own assignment only | ❌ (permission exists server-side, but assignment routes are hard-gated to `DELIVERY_PARTNER`; no admin-facing route uses it in V1) |
| delivery:update-own-location | ❌ | ❌ | ✅ only during active assignment | ❌ (read-only) |
| payment:initiate | ✅ own order | ❌ | ❌ | ❌ |
| payment:webhook-process | ❌ (system-only, signature-verified) | ❌ | ❌ | ❌ |
| payment:refund | ❌ | ❌ | ❌ | ✅ |
| payment:read-all | ❌ | ❌ (no per-restaurant settlement view in V1 — restaurant order/revenue figures come from `GET /orders/summary` instead) | ❌ (no per-partner payment view in V1 — earnings come from `GET /delivery/earnings` instead) | ✅ |
| payment:reconcile-cod | ❌ | ❌ | ❌ | ✅ (added Phase 9 — marks a COD payment as collected/settled) |
| review:create-own-order | ✅ own delivered order | ❌ | ❌ | ❌ |
| coupon:manage | ❌ | ❌ | ❌ | ✅ |
| marketing:manage | ❌ | ❌ | ❌ | ✅ (added Phase 9 — banners/offers CRUD) |
| coupon:apply | ✅ | ❌ | ❌ | ❌ |
| config:manage-platform | ❌ | ❌ | ❌ | ✅ |
| approvals:manage | ❌ | ❌ | ❌ | ✅ |
| users:manage | ❌ | ❌ | ❌ | ✅ |
| reports:read | ❌ | 🟡 own restaurant reports | 🟡 own earnings reports | ✅ all |
| notifications:read-own | ✅ | ✅ | ✅ | ✅ |
| audit-log:read | ❌ | ❌ | ❌ | ✅ |

## 4. Ownership Rules (enforced server-side, not derivable from role alone)

- A `RESTAURANT` user may only mutate/read entities belonging to the restaurant referenced by their own `user.restaurantId` (resolved server-side from the authenticated user's own account, never from a client-supplied restaurant id) **and** only while `restaurant.status === APPROVED`.
- A `DELIVERY_PARTNER` may only act on `deliveryAssignments` where `assignment.partnerId === user.deliveryPartnerId` (the authenticated user's own account field), and location updates are only accepted while there is an active assignment (`ACCEPTED`, `PICKED_UP`, `OUT_FOR_DELIVERY`).
- A `CUSTOMER` may only read/cancel/review orders where `order.customerId === req.user.id`.
- `ADMIN` bypasses ownership checks but every bypass is written to `auditLogs`.

## 5. Middleware Implementation Notes

- `requireRole(...role)`: Express middleware that reads the allowed roles for the route and compares to `req.user.role` populated by the preceding `authenticate` middleware from the verified JWT.
- `requirePermission(...permission)`: Express middleware that resolves the permission set server-side from the user's role + account status (not just JWT claim) for high-risk routes (approvals, refunds, payouts), and rejects with `403` if not satisfied.
- Ownership checks are implemented in service layer (not middleware) since they require loading the target resource.
- Restaurant/Delivery Partner accounts with status `PENDING`/`REJECTED`/`SUSPENDED` are blocked at middleware level from all `manage-own` permissions, redirected to an onboarding-status view on the frontend.
