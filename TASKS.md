# Project Tasks

> Version 1 technology stack is LOCKED: Angular + Capacitor + Node.js + Express + MongoDB + Socket.IO, with Node.js scheduled jobs (`node-cron`) replacing any queue/cache infrastructure. No NestJS, Redis, BullMQ, Kafka, RabbitMQ, Kubernetes, Elasticsearch/OpenSearch, distributed cache, or microservices in Version 1. See `docs/ARCHITECTURE.md` §7 (Future-Scaling Rule) before introducing any of these.

## Phase 0 — Architecture & Documentation

- [x] Architecture
- [x] ERD
- [x] API contract
- [x] Role permissions
- [x] Order state machine
- [x] Architecture documentation audit
- [x] Final Version 1 technology stack locked

## Phase 1 — Bootstrap

- [x] Angular setup
- [x] Node.js setup
- [x] Express setup
- [x] MongoDB/Mongoose setup
- [x] Docker/Docker Compose
- [x] Environment configuration
- [x] Swagger/OpenAPI
- [x] Socket.IO foundation
- [x] Angular PWA foundation
- [x] Capacitor foundation
- [x] Shared project structure

## Phase 2 — Authentication

- [x] Mobile OTP
- [x] Email OTP
- [x] JWT
- [x] Refresh token
- [x] RBAC
- [x] Permission guards

## Phase 3 — Customer

- [x] Home + location selection
- [x] Search food/restaurants + categories
- [x] Restaurant listing/details, menu, food details
- [x] Cart (add/update/remove, add-ons, instructions)
- [x] Coupons, saved addresses
- [x] Checkout (charges, taxes, payment method selection)
- [x] Orders (current, history, details, cancel, reorder)
- [x] Ratings/reviews, profile, notifications

## Phase 4 — Restaurant

- [x] Onboarding (owner/restaurant/address/documents/bank) + admin approval
- [x] Dashboard (today/pending/preparing/ready/completed/cancelled/revenue)
- [x] Menu management (categories, items, add-ons, variations)
- [x] Order workflow (accept/reject/prep time/ready/complete)

## Phase 5 — Delivery

- [x] Registration (personal/vehicle/documents/bank) + admin approval
- [x] Status machine (PENDING/APPROVED/REJECTED/SUSPENDED/AVAILABLE/BUSY/OFFLINE)
- [x] Assignment accept/decline, navigation, arrived/picked up/OTP/delivered
- [x] Delivery history + earnings
- [x] LocationService abstraction (browser geolocation)

## Phase 6 — Order Engine

- [x] Backend order state machine enforcement
- [x] Order creation, snapshotting menu items
- [x] Assignment engine (delivery partner matching)
- [x] Order timeout checks (Node.js scheduled jobs, MongoDB-backed)

## Phase 7 — Payments

- [x] PaymentGateway abstraction (Razorpay/Cashfree)
- [x] UPI/Card/Netbanking/COD
- [x] Server-side verification + webhook processing (idempotent)
- [x] Refunds + reconciliation

## Phase 8 — Tracking

- [x] Socket.IO server (order + location channels)
- [x] Delivery partner live location updates
- [x] Customer live tracking UI + map integration (backend events/authorization shipped in Phase 8; the Angular UI/map wiring itself was completed later, in the Post-Phase-13 Integration pass below — uses Google Maps deep-links, not an embedded Maps SDK)

## Phase 9 — Admin

- [x] Dashboard (orders/revenue/customers/restaurants/partners/approvals/active deliveries)
- [x] Users, restaurants, delivery partners management
- [x] Orders search/filter/cancel/reassign
- [x] Payments (history/failed/refunds/COD reconciliation)
- [x] Configuration (charges/taxes/commission/min order/zones/cancellation rules)
- [x] Marketing (coupons/offers/banners) — backend CRUD shipped in Phase 9; the Angular admin UI itself was completed later, in the Post-Phase-13 Integration pass below
- [x] Reports — backend endpoints (orders/sales/restaurants/delivery-partners/customers) shipped in Phase 9; the Angular admin UI itself was completed later, in the Post-Phase-13 Integration pass below

## Phase 10 — Notifications

- [x] Push (FCM), SMS, Email providers
- [x] Event-driven notification triggers via direct service calls + Node.js scheduled jobs

## Phase 11 — PWA

- [x] Manifest, service worker, app shell caching
- [x] Update handling, safe caching strategy (no sensitive API caching)

## Phase 12 — Testing

- [x] Unit/integration/e2e test strategy execution (see docs/TESTING.md — backend Jest+supertest+mongodb-memory-server suite fully executed and passing; frontend Vitest unit tests executed and passing; Playwright e2e specs written, 2/4 files executable — browser binary could not be downloaded in this sandbox, see docs/TESTING.md §4)

## Phase 13 — Deployment

- [x] Production Docker/Compose, environment/secrets, CI/CD (see docs/DEPLOYMENT.md — production builds run and pass; Docker/Gradle execution itself not runnable in this sandbox, see docs/DEPLOYMENT.md §12)

## Post-Phase-13 Integration

> Completion/integration pass over the existing Version 1 application, triggered by a self-audit against product requirements. No new architecture, no new infrastructure — only closing gaps in the existing code paths. Do not mark an item complete until it is actually implemented and verified (build/test run, not just written).

- [x] Critical payment/order integration — `markPaid()` in `apps/api/src/modules/orders/orders.service.ts` now chains PAID straight through to `RESTAURANT_PENDING` (mirrors the COD path), same as the existing `autoRejectStaleOrder` two-pushHistory pattern. Verified: `apps/api/test/integration/payment-webhook.spec.ts` updated to assert the corrected status; full backend suite passing (8 suites / 32 tests).
- [x] Customer live tracking UI/map — `GET /orders/:id/tracking` now returns `assignmentId` + a `partnerLocation` snapshot; `SocketService` rewritten for authenticated per-namespace connections; `current-order.component.ts` joins `/orders` and `/tracking` rooms, live-updates status and partner location, stops tracking on terminal status, and links out to Google Maps (no paid Maps API key introduced, consistent with the existing delivery-dashboard "Navigate" link pattern). Verified via `npm run build:web`.
- [x] Admin Angular UI — real screens now built under `apps/web/src/app/features/admin/` (dashboard, users, restaurants + approvals, delivery partners + approvals, orders w/ cancel+reassign, payments w/ refund+COD reconciliation, coupons CRUD, platform config form, marketing (banners+offers) CRUD, reports, audit logs), reusing the same standalone-component/signal/`APP_CONFIG` patterns as the other feature areas. Required one small, justified backend addition: `GET /restaurants/admin/all` (ADMIN-only, any status incl. SUSPENDED — the existing public list only ever returned APPROVED restaurants, so there was no way to find a suspended one to reactivate). Verified via `npm run build:api` + `npm run build:web` + full backend test suite (8/32 passing).
- [x] Delivery realtime integration — `dashboard.component.ts` connects `/tracking` and refreshes instantly on `assignment:offered`/`assignment:cancelled`; the existing 15s poll is kept as a fallback, not removed. Verified via `npm run build:web`.
- [x] Restaurant realtime verification — `order-list.component.ts` connects `/orders` and refreshes on `order:status-changed`; relies on the existing Phase 8 backend behavior where RESTAURANT-role sockets auto-join their own `restaurant:<id>` room on connect (no explicit join call needed). Verified via `npm run build:web`.
- [x] External provider configuration — documented in `docs/DEPLOYMENT.md` §1a (new): every placeholder/optional external-provider value (`environment.production.ts` API origin, `ngsw-config.json` dataGroup URLs, no Google Maps key by deliberate design, Razorpay/Firebase/SMTP/SMS env vars, Android release keystore) with its current state and the action needed before going live. No real credentials were fabricated — this is a checklist, not a config change.
- [x] Development seed data — `apps/api/src/scripts/seed-dev.ts` (run via `npm run seed:dev`) creates a demo ADMIN, CUSTOMER, RESTAURANT owner + APPROVED restaurant + menu, DELIVERY_PARTNER (APPROVED/AVAILABLE), a sample address, and ensures platform config exists. Refuses to run when `NODE_ENV=production`. Verified via `tsc` build; idempotent lookups by mobile number reviewed by hand (mongod binary download not available in this sandbox for a full runtime smoke test).
- [x] Delivery-assignment failure handling — bounded retry ROUNDS then automatic cancellation. `order.deliveryAssignmentAttempts` counts rounds (not offer documents, which was the previous bug: one round offering 5 partners consumed the whole budget); round 1 runs inline on `mark-ready`, later rounds run from the existing every-minute `node-cron` job gated by `DELIVERY_ACCEPT_SLA_MINUTES`. A `READY_FOR_PICKUP` order with zero matched partners was previously invisible to every cron check and stuck forever — now picked up by `findOrdersAwaitingDeliveryAssignment`. Once `MAX_DELIVERY_REASSIGN_ATTEMPTS` is exhausted the order goes `DELIVERY_CANCELLED -> REFUND_PENDING` (SYSTEM actor, through `assertTransition`, status history, socket event, notifications), open offers are cancelled + emitted, and an `ORDER_AUTO_CANCELLED_NO_DELIVERY_PARTNER` audit entry is written. Idempotent on repeat cron ticks. Documented in `docs/ORDER-STATE-MACHINE.md` §6. Verified by `apps/api/test/integration/delivery-assignment-failure.spec.ts` (3 tests: retry-then-cancel, idempotency, one-round-is-one-attempt) — full suite 9 suites / 35 tests passing.
- [x] Customer-facing delivery-search wording — `apps/web/src/app/features/customer/data/order-status-label.ts` maps raw statuses to friendly copy (`READY_FOR_PICKUP` → "Food is ready — finding a delivery partner"); no partner ids, retry counts, or matcher internals are exposed. Applied to current-order, order-details and order-history. Verified via `npm run build:web`.
- [x] `PATCH /users/me` — documented in `docs/API-SPEC.md` §3 but never implemented; now added (name/email only, `.strict()` schema rejects `role`/`status`/`permVersion`, registered before `/:id`). Verified via `npm run build:api` + full backend suite.
- [x] Online-payment checkout wiring (frontend) — checkout now offers all four methods. COD is unchanged (place order → order page). For UPI/Card/Netbanking: `POST /orders` (order rests at `PAYMENT_PENDING`) → `POST /payments/initiate` → Razorpay browser checkout → `POST /payments/:orderId/verify`, after which the **backend** verifies the HMAC signature and drives `PAID → RESTAURANT_PENDING`; the frontend never marks an order paid. New `core/payments/razorpay-checkout.service.ts` is the only place touching the Razorpay SDK (lazy script load, one shared instance, dismiss/`payment.failed` handled), and `features/customer/data/payments.service.ts` owns `initiatePayment`/`openCheckout`/`verifyPayment`/`getPaymentStatus`. Duplicate submissions and duplicate order creation are prevented by a retained `pendingOrderId` (retry resumes the same order); dismissal, gateway failure, verify failure and network failure fall back to reading authoritative state from `GET /payments/:orderId/status`; an order left at `PAYMENT_PENDING` can be resumed from the order-details page. Only the **public** Razorpay key id is exposed, via `environment*.ts` `razorpayKeyId` (empty ⇒ online methods shown as "Unavailable", COD still works), so Razorpay TEST MODE keys are sufficient for development. Webhook delivery to localhost is documented in `docs/DEPLOYMENT.md` §1a as a manual runtime step, not bypassed. Verified via `npm run build` + `npm run test` (9 suites / 35 backend tests, 3 files / 8 frontend tests passing).
- [x] FCM device-token registration (frontend) — new `core/notifications/push-notifications.service.ts` is the single push abstraction for all four roles; nothing else touches Firebase/Capacitor push or `POST /notifications/device-token`. Registration is driven by an `effect()` on `AuthService.isAuthenticated()` wired in `app.config.ts`, so it runs at most once per signed-in session (never on navigation, never for anonymous visitors) and resets on logout. **Web/PWA**: dynamic `import('firebase/messaging')` (lazy chunk — not in the initial bundle), `isSupported()` guard, prompts only from `Notification.permission === 'default'` (a prior denial is never re-prompted), then `getToken({ vapidKey, serviceWorkerRegistration })` against a dedicated `public/firebase-messaging-sw.js` registered with the public config as query params (so config stays defined once, in `environment*.ts`). **Capacitor/native**: dynamic `import('@capacitor/push-notifications')`, permission check/request, and the `registration` listener — which doubles as the native token-refresh path. Web refresh is covered by re-running `getToken()` each session; the backend `registerDeviceToken` already upserts by `fcmToken`, so refreshed tokens and user reassignment need no new endpoint. Every failure path (missing config, denied permission, unsupported browser, token failure, network failure) is swallowed so login/app usage is unaffected. Only public Firebase client config is exposed — the Admin service account stays server-side. Verified via `npm run build` + `npm run test` (9 suites / 35 backend, 3 files / 8 frontend passing).
- [ ] End-to-end manual verification — still not performed against a real running stack. Re-checked this pass: this machine has Node v22.23.2 but **no `docker`, no `docker-compose`, no `mongod`, no `mongosh`**, so the API/web/Mongo stack cannot be started and `npm run seed:dev` cannot be executed here. The delivery-failure scenario, four-role journeys and transition rules are instead covered by the backend integration suite, which drives the real Express app over real HTTP (supertest) against a real MongoDB (ephemeral in-process per test file).
- [ ] Production readiness verification — depends on the still-open end-to-end manual verification above.

## Phase G — Final UX Hardening Pass

- [x] Create shared `BackButtonComponent` based on existing design system.
- [x] Implement natural back navigation in detail screens (`restaurant-detail`, `food-detail`, `cart`, `checkout`, `order-details`).
- [x] Audit all API-driven screens and replace global `app-loading-spinner` with component-specific `.skeleton` shimmers.
- [x] Ensure subtle and fast UX with consistent loading/error state changes using the `.skeleton` animation.
- [x] Verify UI micro-animations and transition styling (`_components.scss`).
