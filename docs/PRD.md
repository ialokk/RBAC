# Product Requirements Document (PRD)

## 1. Purpose

A production-oriented, single-application food delivery platform. **Version 1 is locked to fewer than 1,000 orders/day**, running as a single Angular frontend (PWA, packaged for Android via Capacitor) and a single Node.js + Express backend (modular monolith, single instance) across four roles — **CUSTOMER**, **RESTAURANT**, **DELIVERY_PARTNER**, **ADMIN**. Higher volumes are an explicit future scaling phase, not part of Version 1 (see `ARCHITECTURE.md` §7 Future-Scaling Rule).

## 2. Goals

- One deployable Angular app whose UI adapts to the authenticated user's role.
- One deployable Node.js + Express API enforcing authorization server-side regardless of client claims.
- Modular monolith now; module boundaries clean enough to extract services later if scale demands it.
- Correctness and auditability of orders, payments, and delivery over premature scaling optimizations.

## 3. Non-Goals (for now)

- Microservices, multi-region active-active, Redis/BullMQ/Kafka/RabbitMQ, Kubernetes, Elasticsearch/OpenSearch, or any distributed cache — none are required at Version 1 scale (see Future-Scaling Rule).
- Advanced ML-based recommendations/search ranking (start with Atlas Search/Mongo text search).
- Multi-currency/international tax regimes (India-first: GST, UPI, Razorpay/Cashfree).

## 4. Personas

| Persona | Description |
|---|---|
| Customer | Browses restaurants, orders food, pays online/COD, tracks delivery. |
| Restaurant Owner/Staff | Manages menu, accepts/rejects orders, prepares food. |
| Delivery Partner | Accepts assignments, picks up and delivers orders, tracks earnings. |
| Admin | Approves onboarding, configures platform, resolves exceptions, views reports. |

## 5. Key Use Cases (summary — see per-role feature lists in the master spec)

- Auth: mobile/email OTP login, refresh sessions, device/session management, logout.
- Customer: discovery → cart → checkout → payment → tracking → post-order actions.
- Restaurant: onboarding (pending admin approval) → menu management → order workflow.
- Delivery Partner: onboarding (pending admin approval) → availability → assignment lifecycle → earnings.
- Admin: approvals, configuration, exception handling, reporting.

## 6. Success Metrics

- Order success rate (CREATED → DELIVERED) ≥ 95%.
- Payment verification: 100% server-side verified, 0% trusted client callbacks.
- P95 API latency < 400ms for read endpoints, < 800ms for order/payment writes.
- Live tracking update latency < 5s end-to-end (partner device → customer screen).

## 7. Constraints

- Never trust frontend-selected role or client-reported payment success.
- Backend is the single source of truth for the order state machine.
- Secrets/keys only via environment variables / secret manager — never hard-coded.

## 8. Assumptions

- Primary market: India (UPI-first payments, SMS OTP, GST-based taxes).
- Web-first delivery to customers and restaurants; delivery partner may also use the responsive PWA on mobile browsers initially.

## 9. Release Strategy

Phased delivery per `DEVELOPMENT-PLAN.md`, each phase ending in a working, buildable increment. No phase implements features outside its declared scope.
