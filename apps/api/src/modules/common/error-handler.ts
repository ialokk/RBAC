import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http-error';

// Foundation only — extended with structured error types/logging as features are implemented.
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ statusCode: 404, message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(statusCode).json({
    statusCode,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
    error: err.name,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}
