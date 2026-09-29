# Security Design

## 1. Principles

- Zero trust of client-supplied identity/role/payment claims — every privileged decision is re-derived/re-verified server-side.
- Defense in depth: guard layer + service-layer ownership checks + DB-level constraints + audit logging.
- Least privilege: permissions scoped to resource ownership, not just role.

## 2. AuthN / AuthZ

- **JWT access token**: short-lived (e.g. 15 min), contains `sub`, `role`, `permVersion` (invalidation hook), no sensitive PII.
- **Refresh token**: opaque random value, stored **hashed** in `refreshTokens`, rotated on every use (old token revoked), bound to `deviceId`; enables session/device management UI (list + revoke).
- **Role middleware**: `requireRole('ADMIN')`-style Express middleware checked against verified JWT claim.
- **Permission middleware**: fine-grained checks resolved server-side (see `ROLE-PERMISSIONS.md`); high-risk actions re-check account `status` from DB (not just token) to catch just-suspended accounts immediately.
- **Ownership checks**: performed in service layer against the loaded resource (`restaurantId`, `partnerId`, `customerId` match), independent of guards.
- Restaurant/Delivery Partner accounts blocked from `manage-own` routes unless `status === APPROVED`.

## 3. OTP Security

- OTP codes stored as salted hash (`codeHash`), never plaintext, in `otpChallenges`, with a MongoDB TTL index driving expiry/cleanup (no external cache).
- Attempt limiting: max verify attempts per challenge (e.g. 5, tracked via `attempts` field) then challenge invalidated; new OTP requires fresh request.
- Rate limiting: per-mobile/email and per-IP request throttling via an in-memory Express rate-limit middleware (`express-rate-limit`), suitable for a single backend instance in Version 1; escalates to a shared store only if a future phase adds multiple instances.
- OTP expiry: short TTL (e.g. 5 minutes), enforced via MongoDB TTL index + explicit `expiresAt` check in application logic.

## 4. DTO Validation & Input Sanitization

- A shared `validate(schema)` Express middleware validates every request (body/params/query) against a Zod/Joi schema before it reaches the controller; unknown/extra fields (like a client-supplied `status` or `role`) are stripped/rejected (`strict`/`stripUnknown` mode).
- All string inputs constrained by length/format in the validation schemas; rich text fields (reviews, instructions) sanitized against script injection before storage/render.
- Mongoose schemas add a second layer of type/shape enforcement.

## 5. Payment Security

- `PaymentGateway` abstraction: business logic never talks to Razorpay/Cashfree SDK directly; only through the interface, easing provider swap and testing.
- Client never confirms payment success directly to the order; the frontend only triggers "check status," while the **server verifies** via gateway signature/API and/or webhook before transitioning `PAYMENT_PENDING → PAID`.
- Webhook endpoint verifies provider signature (HMAC) before processing; **idempotent** by recording processed `webhookEventIds` on the payment document — duplicate deliveries are no-ops.
- Refunds only initiated by Admin action or automated refund workflow (never by customer-controlled endpoint directly mutating payment state).

## 6. Rate Limiting & Abuse Prevention

- Global request throttling (`express-rate-limit`, in-memory store) with stricter limits on: OTP request/verify, login, order creation, payment initiation — sufficient for Version 1's single-instance deployment.
- IP + account-based limits combined to reduce abuse.
- Critical sections (e.g., assignment offer to a single partner, coupon redemption count) protected using MongoDB atomic operations (`findOneAndUpdate` with a status/version condition) rather than a distributed lock — safe on a single backend instance at Version 1 scale. Distributed locking (e.g., Redis) is deferred to a future scaling phase if multiple instances are introduced.

## 7. Transport & Headers

- CORS restricted to configured frontend origin(s); credentials mode explicit.
- Security headers via `helmet` (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- All traffic over HTTPS in production (TLS terminated at reverse proxy/load balancer).
- WebSocket handshake requires valid JWT; connections join only rooms the authenticated user is authorized for (order-owner, assigned-restaurant, assigned-partner, admin).

## 8. Secrets Management

- No secrets/keys/URLs hard-coded; all via environment variables validated at boot (fail-fast if missing) using a typed config schema.
- Local dev uses `.env` (git-ignored); production uses platform secret store (e.g., Docker secrets / cloud secret manager) — documented, not implemented as code in this repo.
- Bank details / sensitive documents fields stored encrypted at rest (application-level field encryption) where feasible; access limited to Admin approval workflows and audited.

## 9. Audit Logging

- `auditLogs` collection records: admin approvals/rejections, suspensions, order cancellations by admin, refunds, reassignments, configuration changes — actor, action, target, before/after metadata, IP/user-agent.
- Audit log writes are append-only from the application's perspective (no update/delete endpoints exposed).

## 10. PWA-Specific Security

- Service worker caching strategy explicitly excludes authenticated/sensitive API responses (orders, payments, profile) — only static app-shell assets and public content (e.g. restaurant listing images) use cache-first/stale-while-revalidate; API calls with auth headers are network-only or network-first with no persistent cache of response bodies.

## 11. Dependency & Infra Hygiene

- Dependencies kept current; lockfiles committed; no known-vulnerable packages introduced deliberately.
- MongoDB not exposed publicly; only reachable within the Docker Compose network / private VPC.
- Version 1 introduces no additional infrastructure (no Redis, queue broker, search engine, or orchestration platform) beyond what is listed in `ARCHITECTURE.md`; see its Future-Scaling Rule before adding any.
