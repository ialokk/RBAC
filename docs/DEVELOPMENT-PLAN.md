# Development Plan

## 1. Phased Delivery Sequence

```mermaid
flowchart TD
  P0[Phase 0: Architecture] --> P1[Phase 1: Bootstrap]
  P1 --> P2[Phase 2: Authentication]
  P2 --> P3[Phase 3: Customer]
  P3 --> P4[Phase 4: Restaurant]
  P4 --> P5[Phase 5: Delivery]
  P5 --> P6[Phase 6: Order Engine]
  P6 --> P7[Phase 7: Payments]
  P7 --> P8[Phase 8: Tracking]
  P8 --> P9[Phase 9: Admin]
  P9 --> P10[Phase 10: Notifications]
  P10 --> P11[Phase 11: PWA]
  P11 --> P12[Phase 12: Testing]
  P12 --> P13[Phase 13: Deployment]
  P13 --> PP13[Post-Phase-13: Integration & Consistency Pass]
```

Each phase must end with a working build (`ng build` for the Angular app / `tsc` build (or `npm run build`) for the Express API succeed) before moving on. Test cases and lint are skipped for now per current instructions, but build errors must be fixed before closing a phase.

**Phases 0–13 are complete** (see `TASKS.md` for the authoritative, per-item checklist). The Post-Phase-13 pass is not a new architectural phase — it is a completion/integration/documentation-consistency pass over the existing application, explicitly scoped to closing gaps identified by a self-audit rather than adding features (see §7 below).

## 2. Phase Scope Definitions

- **Phase 1 — Bootstrap**: Monorepo scaffolding (`apps/web`, `apps/api`, `libs/*`), Angular standalone app shell with lazy route stubs for `auth/customer/restaurant/delivery/admin`, Node.js + Express skeleton with Swagger, MongoDB/Mongoose connection, Docker Compose (`mongo`, `api`, `web` — no `redis`), environment configuration, Socket.IO foundation, Angular PWA foundation, Capacitor foundation (Android packaging), shared project structure (`libs/shared-types`, `shared-utils`, `shared-validation`). No business logic yet.
- **Phase 2 — Authentication**: OTP request/verify (mobile + email), JWT access/refresh issuance and rotation, session/device management, `requireRole`/`requirePermission` Express middleware, restaurant/delivery PENDING application intake (no admin UI yet beyond minimal approval endpoint).
- **Phase 3 — Customer**: Discovery (home, location, search, categories, listing, details, menu), cart, coupons, saved addresses, checkout (charges/taxes preview), order placement (COD + online payment handoff), order history/details/cancellation/reorder, reviews, profile, notifications inbox.
- **Phase 4 — Restaurant**: Onboarding flow UI, dashboard, menu management, order workflow (accept/reject/prep time/preparing/ready/complete).
- **Phase 5 — Delivery**: Registration flow UI, status management, assignment lifecycle UI, LocationService abstraction (browser geolocation), history/earnings.
- **Phase 6 — Order Engine**: Full backend state machine enforcement, assignment engine, snapshotting, order timeout checks via Node.js scheduled jobs (`node-cron`, MongoDB-backed, no queue).
- **Phase 7 — Payments**: PaymentGateway abstraction + Razorpay/Cashfree integration, webhook verification, refunds, COD reconciliation.
- **Phase 8 — Tracking**: Socket.IO gateways (order + location channels) and partner location heartbeat shipped in this phase. The customer-facing live tracking UI/map wiring was scoped here originally but actually completed later, in the Post-Phase-13 Integration pass (§7) — it uses Google Maps deep-links (`https://www.google.com/maps?q=lat,lng`), not an embedded Maps JavaScript SDK, to avoid a new paid-API-key dependency.
- **Phase 9 — Admin**: Backend endpoints shipped in this phase — dashboard, user/restaurant/partner management, order exception handling, configuration, marketing (banners/offers) CRUD, reports, audit logs. The Angular admin UI consuming these endpoints was scoped here originally but actually completed later, in the Post-Phase-13 Integration pass (§7).
- **Phase 10 — Notifications**: Push/SMS/Email providers wired directly to domain events, with Node.js scheduled jobs (`node-cron`) handling retries/cleanup (no queue system) across the full event list. Complete as described.
- **Phase 11 — PWA**: Manifest, service worker, caching strategy, install/update UX. Complete as described.
- **Phase 12 — Testing**: Test strategy execution (unit/integration/e2e) once explicitly requested. Complete as described — see `docs/TESTING.md`.
- **Phase 13 — Deployment**: Production Docker/Compose hardening, CI/CD, secret management, environment promotion. Complete as described — see `docs/DEPLOYMENT.md`.

## 7. Post-Phase-13 Integration Pass

After Phases 0–13 were all marked complete, a self-audit (triggered by a suspected payment/order integration bug) found several gaps between documentation-complete and functionally-complete: a critical bug where online (non-COD) payments never progressed the order past `PAID` to `RESTAURANT_PENDING`; the customer live-tracking UI, restaurant/delivery realtime wiring, and admin UI were all backend-complete but frontend-incomplete; a development seed script and an external-provider/placeholder configuration audit doc were missing. This pass closed all of those gaps using only the existing architecture (no new infrastructure, no new phase) — see `TASKS.md`'s "Post-Phase-13 Integration" section for the itemized, verified record.

## 3. Authentication Flow

```mermaid
sequenceDiagram
  participant U as User (any role)
  participant W as Angular App
  participant A as Auth Module (Express)
  participant DB as MongoDB
  participant SMS as SMS/Email Provider

  U->>W: Enter mobile/email
  W->>A: POST /auth/otp/request
  A->>DB: Upsert otpChallenges {codeHash, expiresAt, attempts=0} (TTL index + rate-limit check)
  A->>SMS: Send OTP
  SMS-->>U: OTP delivered
  U->>W: Enter OTP
  W->>A: POST /auth/otp/verify {target, code, deviceId}
  A->>DB: Validate OTP (attempts, expiresAt) against otpChallenges
  A->>DB: Upsert user, create refreshToken (hashed), resolve role
  A-->>W: accessToken (short-lived) + refreshToken
  W->>W: Route to role-specific shell based on resolved role
  Note over W,A: Access token expires
  W->>A: POST /auth/refresh {refreshToken}
  A->>DB: Validate + rotate refresh token
  A-->>W: new accessToken + refreshToken
```

## 4. Payment Lifecycle

```mermaid
sequenceDiagram
  participant C as Customer (Angular)
  participant API as Orders/Payments Module
  participant PG as PaymentGateway (Razorpay/Cashfree)
  participant DB as MongoDB

  C->>API: POST /orders (create, status=CREATED)
  API->>DB: Save order
  C->>API: POST /payments/initiate {orderId, method}
  API->>PG: Create gateway order
  PG-->>API: gatewayOrderId
  API->>DB: payment=INITIATED, order=PAYMENT_PENDING
  API-->>C: gateway checkout params (no secret keys to client)
  C->>PG: Complete payment (UPI/Card/Netbanking) in gateway UI/SDK
  PG-->>C: client-side "success" (NOT TRUSTED)
  PG-->>API: Webhook: payment captured (signed)
  API->>API: Verify signature + de-dupe via webhookEventIds
  API->>PG: (optional) Server-side verify API call
  API->>DB: payment=SUCCESS, order=PAID
  API-->>C: Realtime order status update (Socket.IO)
  Note over API,PG: If webhook missing, a Node.js scheduled reconciliation job (node-cron) polls the gateway
```

## 5. Delivery Tracking Flow

```mermaid
sequenceDiagram
  participant Sys as Assignment Engine
  participant DP as Delivery Partner (Angular)
  participant API as Delivery/Tracking Module
  participant WS as Socket.IO Gateway
  participant Cust as Customer (Angular)

  Sys->>API: Order READY_FOR_PICKUP -> find nearest AVAILABLE partner
  API->>DP: Offer assignment (push + socket)
  DP->>API: POST /delivery/assignments/:id/accept
  API->>API: order=DELIVERY_ASSIGNED->DELIVERY_ACCEPTED
  API->>WS: Emit order status + partner assigned to room order:<id>
  WS-->>Cust: Live update: partner assigned
  loop While assignment active
    DP->>API: POST /delivery/location (heartbeat, LocationService)
    API->>WS: Emit to room assignment:<id>
    WS-->>Cust: Partner location on map
  end
  DP->>API: arrived-restaurant / picked-up
  API->>WS: status updates
  DP->>API: arrived-customer
  Cust->>DP: Shares delivery OTP
  DP->>API: verify-otp
  API->>API: order=DELIVERED
  API->>WS: Final status update
  WS-->>Cust: Order delivered
```

## 6. Definition of Done per Phase

- Contract in `API-SPEC.md` / `ROLE-PERMISSIONS.md` / `ORDER-STATE-MACHINE.md` respected; any deviation updates the doc first.
- `apps/web` and `apps/api` build successfully.
- No hard-coded secrets/URLs introduced.
- No Redis, queue system (BullMQ/Kafka/RabbitMQ), microservice, Kubernetes, NestJS, or dedicated search engine introduced (see `ARCHITECTURE.md` §7 Future-Scaling Rule).
- Only the requested phase's modules/components touched; no unrelated refactors.
- `TASKS.md` checkboxes updated to reflect completed items.
