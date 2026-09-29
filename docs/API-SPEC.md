# API Contract (REST)

Base path: `/api/v1`. All responses JSON. All authenticated routes require `Authorization: Bearer <accessToken>`. Errors follow `{ statusCode, message, error, path, timestamp }`. This document defines the contract shape for Phase 0; implementation happens in later phases and must conform to this contract (update this file if a contract changes).

## 1. Conventions

- Pagination: `?page=1&limit=20` → `{ items[], total, page, limit }`.
- Money fields: integers in minor currency unit (paise).
- Timestamps: ISO-8601 UTC.
- Role/permission requirements noted per route; ownership rules per `ROLE-PERMISSIONS.md` apply in addition.

## 2. Auth (`/auth`) — public unless noted

| Method | Path | Description |
|---|---|---|
| POST | `/auth/otp/request` | Request OTP — body `{ target, channel: SMS\|EMAIL, purpose }` |
| POST | `/auth/otp/verify` | Verify OTP, returns tokens — body `{ target, code, deviceId }` |
| POST | `/auth/refresh` | Rotate refresh token — body `{ refreshToken }` |
| POST | `/auth/logout` | Revoke current session — auth required |
| GET | `/auth/sessions` | List active sessions/devices — auth required |
| DELETE | `/auth/sessions/:id` | Revoke a specific session — auth required |
| GET | `/auth/me` | Current user profile + role + status — auth required |

## 3. Users/Profile (`/users`)

| Method | Path | Role |
|---|---|---|
| GET | `/users/me` | any authenticated |
| PATCH | `/users/me` | any authenticated (own profile fields only) |
| GET | `/users` (search/list) | ADMIN |
| GET | `/users/:id` | ADMIN |
| PATCH | `/users/:id/status` (activate/deactivate) | ADMIN |

## 4. Addresses (`/addresses`) — CUSTOMER (own)

| Method | Path |
|---|---|
| GET | `/addresses` |
| POST | `/addresses` |
| PATCH | `/addresses/:id` |
| DELETE | `/addresses/:id` |

## 5. Restaurant Applications (`/restaurant-applications`)

| Method | Path | Role |
|---|---|---|
| POST | `/restaurant-applications` | authenticated user (becomes applicant) |
| GET | `/restaurant-applications/me` | applicant |
| GET | `/restaurant-applications` (list/filter by status) | ADMIN |
| GET | `/restaurant-applications/:id` | ADMIN, owner applicant |
| PATCH | `/restaurant-applications/:id/approve` | ADMIN |
| PATCH | `/restaurant-applications/:id/reject` | ADMIN — body `{ reason }` |

## 6. Restaurants (`/restaurants`)

| Method | Path | Role |
|---|---|---|
| GET | `/restaurants` (search/filter/sort, geo-radius) | public |
| GET | `/restaurants/:id` | public |
| GET | `/restaurants/me` | RESTAURANT (own) |
| PATCH | `/restaurants/me` | RESTAURANT (own, APPROVED only) |
| PATCH | `/restaurants/me/open-status` | RESTAURANT (own) |
| PATCH | `/restaurants/:id/suspend` \| `/activate` | ADMIN |
| GET | `/restaurants/admin/all` (any status incl. SUSPENDED — post-Phase-13 admin UI addition) | ADMIN |

## 7. Menu (`/restaurants/:restaurantId/menu`)

| Method | Path | Role |
|---|---|---|
| GET | `.../categories` | public |
| POST/PATCH/DELETE | `.../categories(/:id)` | RESTAURANT (own) |
| GET | `.../items` | public |
| POST/PATCH/DELETE | `.../items(/:id)` | RESTAURANT (own) |
| POST/PATCH/DELETE | `.../addons(/:id)` | RESTAURANT (own) |

## 8. Search (`/search`)

| Method | Path | Description |
|---|---|---|
| GET | `/search/restaurants?q=&lat=&lng=&filters...` | Atlas/Mongo text search, geo-aware |
| GET | `/search/food?q=` | food item search across restaurants |
| GET | `/search/autocomplete?q=` | fast prefix/fuzzy suggestions |

## 9. Cart (`/cart`) — CUSTOMER (own)

| Method | Path |
|---|---|
| GET | `/cart` |
| POST | `/cart/items` |
| PATCH | `/cart/items/:itemRef` |
| DELETE | `/cart/items/:itemRef` |
| POST | `/cart/coupon` |
| DELETE | `/cart/coupon` |
| POST | `/cart/checkout-preview` (returns charges/taxes/total breakdown) |

## 10. Orders (`/orders`)

| Method | Path | Role |
|---|---|---|
| POST | `/orders` (create from cart) | CUSTOMER |
| GET | `/orders` (own history, paginated/filterable) | CUSTOMER/RESTAURANT/DELIVERY_PARTNER (own scope), ADMIN (all + filters) |
| GET | `/orders/current` | CUSTOMER |
| GET | `/orders/:id` | owner scope or ADMIN |
| POST | `/orders/:id/cancel` | CUSTOMER (own, allowed states), ADMIN (any) |
| POST | `/orders/:id/reorder` | CUSTOMER |
| POST | `/orders/:id/restaurant-accept` | RESTAURANT (own) |
| POST | `/orders/:id/restaurant-reject` (body `{ reason }`) | RESTAURANT (own) |
| POST | `/orders/:id/set-prep-time` | RESTAURANT (own) |
| POST | `/orders/:id/mark-preparing` | RESTAURANT (own) |
| POST | `/orders/:id/mark-ready` | RESTAURANT (own) |
| POST | `/orders/:id/reassign-delivery` | ADMIN |
| GET | `/orders/:id/tracking` (status + partner location snapshot) | CUSTOMER (own), ADMIN |
| GET | `/orders/summary` (today's orders/revenue + counts per status group) | RESTAURANT (own) — added in Phase 4 for the restaurant dashboard |

## 11. Delivery (`/delivery`)

| Method | Path | Role |
|---|---|---|
| POST | `/delivery/applications` | authenticated user |
| GET | `/delivery/applications/me` | applicant |
| GET | `/delivery/applications` (list/filter by status) | ADMIN — added in Phase 5 |
| GET | `/delivery/applications/:id` | ADMIN, owner applicant — added in Phase 5 |
| PATCH | `/delivery/applications/:id/approve` \| `/reject` | ADMIN |
| PATCH | `/delivery/me/availability` (AVAILABLE/BUSY/OFFLINE) | DELIVERY_PARTNER (own) |
| GET | `/delivery/assignments/available` (assignments currently offered to the caller) | DELIVERY_PARTNER (own) — added in Phase 5 |
| GET | `/delivery/assignments/current` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/accept` \| `/decline` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/arrived-restaurant` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/picked-up` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/arrived-customer` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/verify-otp` | DELIVERY_PARTNER (own) |
| POST | `/delivery/assignments/:id/mark-delivered` | DELIVERY_PARTNER (own) |
| POST | `/delivery/location` (heartbeat) | DELIVERY_PARTNER (own, active assignment only) |
| GET | `/delivery/history` | DELIVERY_PARTNER (own) |
| GET | `/delivery/earnings` | DELIVERY_PARTNER (own) |
| PATCH | `/delivery/partners/:id/suspend` \| `/activate` | ADMIN |

## 12. Payments (`/payments`)

| Method | Path | Role |
|---|---|---|
| POST | `/payments/initiate` (body `{ orderId, method }`) | CUSTOMER (own order) |
| POST | `/payments/:orderId/verify` (body `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`) — added in Phase 7: server-side signature check the frontend triggers after checkout, never a client "it succeeded" claim | CUSTOMER (own order) |
| GET | `/payments/:orderId/status` | CUSTOMER (own), ADMIN |
| POST | `/payments/webhook/:gateway` | public but signature-verified (system) |
| POST | `/payments/:id/refund` (body `{ amount?, reason }`, `amount` omitted = full refund) | ADMIN |
| POST | `/payments/:id/reconcile-cod` — added in Phase 9: marks a Cash-on-Delivery payment as collected/settled | ADMIN |
| GET | `/payments?status=&gateway=` (search/filter: failed, COD reconciliation — `gateway=COD&status=INITIATED` finds cash not yet reconciled) | ADMIN |

## 13. Coupons (`/coupons`)

| Method | Path | Role |
|---|---|---|
| GET | `/coupons/applicable?cartId=` | CUSTOMER |
| GET/POST/PATCH/DELETE | `/coupons(/:id)` | ADMIN |

## 14. Reviews (`/reviews`)

| Method | Path | Role |
|---|---|---|
| POST | `/reviews` (body `{ orderId, rating, comment, deliveryPartnerRating }`) | CUSTOMER (own delivered order) |
| GET | `/restaurants/:id/reviews` | public |

## 15. Notifications (`/notifications`)

| Method | Path | Role |
|---|---|---|
| GET | `/notifications` | own (any authenticated) |
| PATCH | `/notifications/:id/read` | own |
| POST | `/notifications/device-token` | own — register FCM token |

## 16. Admin (`/admin`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | orders/revenue/customers/restaurants/partners/pending approvals/active deliveries summary |
| GET | `/admin/reports/{orders\|sales\|restaurants\|delivery-partners\|customers}` | report exports |
| GET/PATCH | `/admin/config` | delivery charges, taxes, commission, min order, service zones, cancellation rules |
| GET/POST/PATCH/DELETE | `/admin/banners`, `/admin/offers` | marketing content |
| GET | `/admin/audit-logs` | audit trail search |

## 17. Realtime (Socket.IO, JWT-authenticated handshake)

Handshake: client connects with `auth: { token: <accessToken> }` (or an `Authorization: Bearer` header); the server verifies the JWT and re-checks the account is `ACTIVE` in MongoDB on every connect/reconnect (a reconnect is a brand-new handshake, so this re-validation is automatic — no separate reconnect-token-refresh flow needed). Single backend instance, no Socket.IO Redis adapter (Version 1).

| Namespace/Room | Direction | Purpose |
|---|---|---|
| `/orders` room `order:<id>` | server → client | status changes, partner assigned, ETA updates — client joins via `join-order {orderId}` (ack-based, ownership-checked; CUSTOMER own order, RESTAURANT own order, DELIVERY_PARTNER assigned order, ADMIN any) |
| `/orders` room `restaurant:<restaurantId>` | server → client | added in Phase 8: incoming/updated orders for a restaurant's own dashboard — RESTAURANT sockets auto-join their own room on connect (server-resolved id, never client-supplied) |
| `/orders` room `partner:<partnerId>` | server → client | added in Phase 8: order status pushes for a partner's assigned order — DELIVERY_PARTNER sockets auto-join on connect |
| `/tracking` room `assignment:<id>` | server → client | delivery partner live location — client joins via `join-assignment {assignmentId}` (ack-based, ownership-checked; CUSTOMER own order's assignment, DELIVERY_PARTNER own assignment, ADMIN any) |
| `/tracking` room `partner:<partnerId>` | client → server | partner emits `location:update {lat,lng}` heartbeat (server validates DELIVERY_PARTNER role + an active assignment via the same check `POST /delivery/location` uses, resolves partnerId server-side, never trusts a client-supplied id); server also uses this room to push `assignment:offered`/`assignment:cancelled`/`partner:availability-changed` (added in Phase 8) |
| `/admin` room `admin:ops` | server → client | live ops feed: new approvals, exceptions — **not implemented in Version 1** (the Post-Phase-13 admin UI reads the same data via plain REST — dashboard/reports/audit-logs polling on page load — instead of a dedicated live feed) |

## 18. Documentation Requirement

Swagger/OpenAPI (`/api/docs`) generated via `swagger-jsdoc`/`swagger-ui-express` from JSDoc annotations on route handlers plus the shared Zod/Joi validation schemas used here; this file is the human-readable contract kept in sync when routes change.
