# Production Deployment (Phase 13)

Version 1 deployment target: a single Docker Compose host running `mongo` + `api` + `web` (nginx), exactly as locked in docs/ARCHITECTURE.md §6/§7 — no Kubernetes, no managed container platform, no Redis/BullMQ/microservices. This document is the operational counterpart to docs/TESTING.md.

## 1. Production environment configuration

- `apps/api` reads all config from environment variables via `config/env.ts` (Zod-validated, fail-fast at boot — see that file for the authoritative required/optional list). `apps/api/.env.example` documents every variable.
- `apps/web` bakes config into the build via `src/environments/environment.production.ts` (`apiBaseUrl`, `socketUrl`) — update these to the real deployed API origin before building; there is no runtime env-var injection for the Angular bundle (standard static-SPA constraint), so a config change requires a rebuild.
- Root `.env.example` documents the subset `docker-compose.yml` consumes.

### 1a. External provider / placeholder configuration audit (post-Phase-13 pass)

Checklist to walk through before a real production deployment — every item below was intentionally left as a placeholder/no-op in Version 1 and must be either filled in or consciously accepted as-is:

| Item | Current state | Action needed before going live |
|---|---|---|
| `apps/web/src/environments/environment.production.ts` `apiBaseUrl`/`socketUrl` | Literal placeholder `https://api.example.com` | Replace with the real deployed API origin, then rebuild `apps/web` (no runtime injection). |
| `apps/web/ngsw-config.json` `public-browse-api` dataGroup `urls` | Same placeholder API origin (must stay in sync with the above — see Phase 11 note in this file's history) | Update together with `environment.production.ts`. |
| Google Maps / any mapping SDK | Not configured anywhere — customer/delivery "map" UI is a plain `https://www.google.com/maps?q=lat,lng` link, not an embedded map | Deliberate Version 1 simplification (avoids a paid Maps JS API key / new infra dependency). Acceptable to ship as-is; only revisit if an embedded map becomes a real product requirement. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Required, no default — placeholder values in `.env.example` only | Must be set to real Razorpay (live mode) credentials; webhook secret must match the webhook configured in the Razorpay dashboard for the production API origin. |
| `razorpayKeyId` in `apps/web/src/environments/environment*.ts` | Empty string by default — the checkout UI then offers Cash on Delivery only and labels online methods "Unavailable" | Set to the **public** key id (`rzp_test_...` in development, `rzp_live_...` in production) and rebuild `apps/web`. Only the key id may ever appear in the Angular bundle — the key secret and webhook secret are server-side only (docs/SECURITY.md §5). |
| Razorpay webhook delivery in local development | Razorpay cannot reach `http://localhost:3000` | Webhook testing needs a publicly reachable HTTPS URL (e.g. an SSH/ngrok-style tunnel) pointed at `POST /api/v1/payments/webhook/razorpay`, with the same `RAZORPAY_WEBHOOK_SECRET` configured in the Razorpay dashboard. This is a **manual runtime verification step** — signature verification is never bypassed to work around it. Note the frontend `POST /payments/:orderId/verify` call already confirms payment on its own; the webhook is the out-of-band safety net. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (push notifications) | Optional — unset falls back to `console.log` | Set to a real Firebase service-account JSON (single-line/escaped) if push notifications are required in production; otherwise push silently no-ops (not a crash, but users get no push). |
| `firebase` in `apps/web/src/environments/environment*.ts` | All fields empty by default — the app then never requests notification permission and never registers a device token | Fill in the **public** Firebase web-app config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) plus the Web Push `vapidKey` from Firebase Console → Project settings → Cloud Messaging, then rebuild `apps/web`. These are public client values; the Admin service account above must never appear here. Must belong to the **same** Firebase project as `FIREBASE_SERVICE_ACCOUNT_JSON` or tokens won't be deliverable. |
| Android push (Capacitor) | `@capacitor/push-notifications` is installed and wired, but `apps/web/android/app/google-services.json` is absent | Download `google-services.json` from the same Firebase project into `apps/web/android/app/`, then `npx cap sync android`. Requires a real device/emulator with Play Services to verify — not runnable in this sandbox. |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (email) | Optional — unset falls back to `console.log` | Set to a real SMTP relay if email OTP/notifications are required in production. |
| `SMS_PROVIDER_API_URL`/`SMS_PROVIDER_API_KEY` (SMS) | Optional, generic HTTP POST `{to,message}` contract — no vendor named | Point at whatever SMS vendor is chosen; adjust `sms.channel.ts` only if the chosen vendor's request/response shape differs from the generic contract. |
| `apps/web/android/keystore.properties` | Absent (git-ignored) — release APK builds unsigned | Generate a real upload keystore (`docs/DEPLOYMENT.md` §12/§13) before a Play Store submission. |

## 2. Secrets management

- Never commit `.env`, `apps/web/android/keystore.properties`, or any keystore (`.jks`/`.keystore`) file — all are git-ignored (see root and `apps/web/.gitignore`).
- Local/single-host: a real `.env` file (chmod 600, outside version control) that `docker-compose.yml` reads via `${VAR}` substitution.
- CI: GitHub Actions' built-in `secrets.*` (the Docker-publish workflow only needs the automatic `GITHUB_TOKEN` for GHCR — no extra secrets to configure for that part). If you later add a real deploy step (SSH to a host, cloud provider API, etc.), store those credentials as repository/environment secrets, never in the workflow file.
- Per docs/SECURITY.md §8: production secrets should ultimately live in a platform secret store (Docker secrets, or your cloud provider's secret manager) rather than a plain `.env` file on disk once you're past single-operator scale — documented here as the recommended next step, not implemented as code (no such platform exists to target in this repo).

## 3. Build configuration

- `npm run build` (root) = `build:libs` → `build:api` → `build:web`, in that order (libs must be compiled to `dist/` first — both apps resolve `@rbac/*` via `node_modules` → `dist`, not raw `src`).
- **Fixed this phase**: both `apps/api/Dockerfile` and `apps/web/Dockerfile` previously skipped the `libs` build step entirely inside the Docker build stage — a real bug that would have failed at `docker build` time (`Cannot find module '@rbac/shared-types'`) the first time anyone actually tried it, since no CI ever existed before Phase 12/13 to catch it. Both Dockerfiles now build `libs/shared-types`, `libs/shared-utils`, `libs/shared-validation` before their respective app.
- `apps/web` production build uses the `production` Angular configuration (`fileReplacements` → `environment.production.ts`, `outputHashing: all`, service worker enabled via `ngsw-config.json`).

## 4. Deployment configuration (Docker Compose)

- `docker-compose.yml`: `mongo` (with a `mongosh` ping healthcheck), `api` (depends on `mongo` being healthy; now has every required env var from `config/env.ts`, including `RAZORPAY_*` which are mandatory — a real gap fixed this phase, the old compose file would have failed `env.ts`'s fail-fast validation immediately on container start), `web` (depends on `api` being healthy).
- Both app Dockerfiles now have `HEALTHCHECK` directives (`/api/v1/health` for the API, `/` for nginx) — Docker Compose surfaces `healthy`/`unhealthy` status, and the `depends_on: condition: service_healthy` chains above rely on them.
- `.dockerignore` (new) keeps build contexts lean (excludes `node_modules`, `dist`, test/e2e artifacts, the Android platform, docs).

## 5. HTTPS

- Per docs/SECURITY.md §7, the default posture is **TLS terminated upstream** (a cloud load balancer/CDN in front of the `web` container) — `apps/web/nginx.conf` deliberately stays HTTP-only internally, which is the normal/simplest setup behind e.g. an AWS ALB, Cloudflare, or a managed platform's LB.
- For a fully self-hosted single box with no upstream LB, `apps/web/nginx.https.conf.example` (new) is a ready-to-adapt nginx config that terminates TLS itself via Let's Encrypt/certbot (HTTP→HTTPS redirect, ACME challenge path, HSTS). Copy it to `nginx.conf`, mount real certs, and publish `443:443` in `docker-compose.yml`.
- The API itself is never directly exposed to the public internet with plaintext HTTP in production — it sits behind the same TLS-terminating layer as `web` (or is only reachable from `web`'s network in a tighter setup).

## 6. CORS

- `env.CORS_ORIGIN` now supports a **comma-separated list** of allowed origins (`config/cors.ts`'s `parseCorsOrigins`, used by both the Express `cors()` middleware and the Socket.IO server's CORS config) — e.g. `CORS_ORIGIN=https://app.example.com,https://staging.example.com` — without changing the env schema's type (still a single string in `.env`).
- `credentials: true` is set everywhere CORS is configured (cookies aren't used for auth, but this keeps `Authorization` header + credentialed fetches working consistently).

## 7. API security (production hardening added this phase)

- **Global rate limiting** (`modules/common/rate-limit.ts`'s new `generalApiLimiter`, applied to every request in `app.ts`) — previously only OTP request/verify had limiters, despite docs/SECURITY.md §6 explicitly requiring "order creation, payment initiation" limits too. Added `orderCreateLimiter` (`POST /orders`) and `paymentInitiateLimiter` (`POST /payments/initiate`) to close that gap.
- `helmet()` (CSP/HSTS/etc.), strict Zod request validation, JWT auth + role/permission middleware, and MongoDB-atomic critical sections were already in place from earlier phases — unchanged.
- Webhook signature verification (`POST /payments/webhook/:gateway`) is intentionally exempt from the global limiter's IP-based logic mattering much less, since it's provider-authenticated by HMAC, not by rate — left as-is.

## 8. Database backup strategy

- `scripts/backup-mongo.sh` — `docker compose exec mongo mongodump --archive --gzip` into a timestamped, gzip-compressed archive; prunes archives older than `BACKUP_RETENTION_DAYS` (default 14). Schedule via host crontab (example in the script's header comment) — deliberately a plain host cron job, not an in-app `node-cron` job or any new service, since backups are an operational/host concern outside the application process.
- `scripts/restore-mongo.sh <archive.gz>` — `mongorestore --drop` from a given archive. Destructive by design; always verify the archive/target environment first.
- For managed MongoDB (Atlas, etc.), prefer the provider's built-in continuous/point-in-time backups instead of these scripts — they're the fallback for a self-hosted `mongo:7` container per the Version 1 Docker Compose topology.

## 9. Logging

- Replaced `morgan` with **`pino` + `pino-http`** (`config/logger.ts`, wired in `app.ts`) — structured JSON logs to stdout (captured by Docker's/the host's log driver; no log-shipping infra added). Each request gets a correlation id automatically (`pino-http` default behavior) and `Authorization`/`Cookie` headers are redacted from logs.
- `LOG_LEVEL` env var (new, optional, default `info`) controls verbosity without a redeploy of code — just restart the container with a different value.
- Logging is skipped entirely when `NODE_ENV=test` (same guard `morgan` used before), keeping test output readable.

## 10. Health checks

- `GET /api/v1/health` — liveness only (process is up, no dependency checks). Used by the API Dockerfile's `HEALTHCHECK`.
- `GET /api/v1/health/ready` (**new**) — readiness: returns 503 unless `mongoose.connection.readyState === 1`. Used by `docker-compose.yml`'s `api` healthcheck (so `web` won't be marked ready to start until the API can actually reach MongoDB).

## 11. CI/CD

- `.github/workflows/ci.yml` (new) — on every push/PR to `main`: install, build `libs` → `api` → `web`, then run both test suites (`npm run test:api`, `npm run test:web`). This is the same sequence documented in docs/TESTING.md, just automated.
  - Note: `apps/api`'s Jest suite uses `mongodb-memory-server`, which downloads a `mongod` binary on first use — this worked in the sandbox this repo was built in, but if your CI runner has restricted network egress, pin/cache the binary (see `mongodb-memory-server`'s docs for `MONGOMS_DOWNLOAD_URL`/version pinning) rather than assuming it "just works" everywhere.
- `.github/workflows/docker-publish.yml` (new) — on push to `main` or a `v*` tag: builds both `apps/api/Dockerfile` and `apps/web/Dockerfile` and pushes to `ghcr.io/<owner>/<repo>-api` / `-web` using the automatic `GITHUB_TOKEN` (no extra secrets needed for this part). **Actually deploying** those images to a live host is deliberately left as a manual/host-specific step (`docker compose pull && docker compose up -d` over SSH, or your platform's equivalent) — there is no live target environment or deploy credentials in this repo to wire up, and fabricating one would be dishonest about what's actually been verified.

## 12. Android release build

- `apps/web/android/app/build.gradle`'s `release` build type now has a real (conditional) `signingConfig`, reading from `android/keystore.properties` (git-ignored; copy from the new `android/keystore.properties.example` and fill in real values) — falls back to an **unsigned** release build when that file doesn't exist, which is fine for local verification but not for Play Store upload.
- Generate a real upload keystore once (see the comment in `keystore.properties.example`):
  ```bash
  keytool -genkeypair -v -keystore rbac-release.jks -alias rbac -keyalg RSA -keysize 2048 -validity 10000
  ```
  Store it somewhere durable and NEVER in version control; back it up (losing it means losing the ability to publish updates under the same Play Store listing unless you're using Play App Signing, see below).
- Build: `cd apps/web && npm run build -- --configuration production && npx cap sync android && cd android && ./gradlew bundleRelease` (Play Store wants an `.aab`, not an `.apk` — `bundleRelease` produces `app/build/outputs/bundle/release/app-release.aab`).
- **This repo's sandbox could not execute an actual Gradle build** (documented in the Phase 11 section of this project's memory/notes) — no Android SDK configured and the Gradle wrapper itself couldn't download its distribution (an outdated JDK 8 trust store). The Gradle configuration above is correct and ready to run on a properly provisioned machine/CI (JDK 17+, Android SDK via Android Studio or `sdkmanager`).

## 13. Play Store release preparation

Checklist (Google Play Console, one-time + per-release items):

- **App signing by Google Play**: enroll the app so Google re-signs your uploaded `.aab` with its own key for distribution — you only need to keep your *upload* key (the one from `keystore.properties`) safe, not a separate "app signing key".
- **Store listing**: app name, short/full description, screenshots (phone + optionally tablet), feature graphic, app icon (512×512), category, contact details.
- **Privacy policy URL** — mandatory; must describe what the app collects (location for delivery tracking, push tokens, payment metadata — never raw card/UPI details, those never touch this app's servers per the PaymentGateway abstraction).
- **Data safety form** — declare each data type collected/shared (location, personal info, financial info via Razorpay, device/other IDs for push) and whether it's encrypted in transit (yes, HTTPS) and deletable on request.
- **Content rating questionnaire**, **target audience/ads declaration** (this app shows no ads), **App access** (provide a test account per role — CUSTOMER/RESTAURANT/DELIVERY_PARTNER/ADMIN — plus login instructions, since the app is otherwise fully gated by OTP + backend approval workflows).
- **Version bump discipline**: `android/app/build.gradle`'s `versionCode` (integer, must strictly increase every release) and `versionName` (user-facing string, e.g. semantic version) — currently `1`/`"1.0"` template defaults; bump both before every new upload.
- Recommended rollout: internal testing → closed testing (a handful of real users across all four roles) → production, using Play Console's staged rollout percentage to limit blast radius of any release issue.

## 14. What was NOT introduced (per explicit constraint)

No Redis, BullMQ, RabbitMQ, Kafka, Kubernetes, or any other distributed/orchestration infrastructure was added. Rate limiting remains in-memory/single-instance (`express-rate-limit`), scheduled work remains `node-cron` in-process, and the deployment topology remains a single Docker Compose host — consistent with docs/ARCHITECTURE.md §7's "Future-Scaling Rule."
