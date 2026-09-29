import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness check — process is up, no dependency checks
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness check — MongoDB connection must be up (Docker/orchestrator readiness probe)
 */
healthRouter.get('/health/ready', (_req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;
  res.status(mongoReady ? 200 : 503).json({
    status: mongoReady ? 'ok' : 'unavailable',
    mongo: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
});
