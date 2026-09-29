import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:4200'),
  // Placeholder platform config (minor currency units / percent) until Phase 9 ships an
  // Admin-configurable, DB-backed config module (delivery charges/taxes/commission/zones).
  DEFAULT_DELIVERY_CHARGE_MINOR: z.coerce.number().int().nonnegative().default(4000),
  DEFAULT_TAX_PERCENT: z.coerce.number().nonnegative().default(5),
  MIN_ORDER_VALUE_MINOR: z.coerce.number().int().nonnegative().default(10000),
  // Flat per-delivery payout until Phase 9 ships Admin-configurable delivery-partner payouts.
  DEFAULT_DELIVERY_PARTNER_EARNING_MINOR: z.coerce.number().int().nonnegative().default(3000),
  // Order-engine SLA thresholds for the node-cron timeout safeguards (docs/ORDER-STATE-MACHINE.md §5).
  // Placeholder defaults until Phase 9 ships Admin-configurable cancellation/SLA rules.
  RESTAURANT_ACCEPT_SLA_MINUTES: z.coerce.number().int().positive().default(10),
  DELIVERY_ACCEPT_SLA_MINUTES: z.coerce.number().int().positive().default(5),
  PAYMENT_PENDING_SLA_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_DELIVERY_REASSIGN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // Razorpay (PaymentGateway implementation, see modules/payments) — required to enable online
  // payment (UPI/Card/Netbanking); COD orders never touch these.
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  // Notification channels (Phase 10) — all OPTIONAL; each channel falls back to console-logging
  // (dev/foundation mode) when unconfigured, same graceful-degradation pattern used elsewhere
  // (e.g. Phase 6's geo-matching fallback), since no specific SMS vendor is locked in the docs.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMS_PROVIDER_API_URL: z.string().optional(),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  NOTIFICATION_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // Structured logging (Phase 13) — pino level; JSON logs to stdout, captured by the container/host
  // log driver. See docs/DEPLOYMENT.md §"Logging".
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

// Fail fast at boot if required environment variables are missing/invalid.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
