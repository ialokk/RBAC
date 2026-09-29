// Runs before any test file/module import (Jest `setupFiles`) — provides required env vars so
// config/env.ts's fail-fast Zod parse succeeds. MONGODB_URI is overwritten per-file by db.ts once
// the in-memory MongoDB instance is up; this placeholder just satisfies the initial parse.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rbac_test_placeholder';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CORS_ORIGIN = 'http://localhost:4200';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
