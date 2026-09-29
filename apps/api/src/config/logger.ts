import pino from 'pino';
import { env } from './env';

// Structured JSON logs (stdout) — captured by Docker/host log drivers in production, no separate
// log-shipping infra required at Version 1 scale. Pretty-printing is a local dev nicety only.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
