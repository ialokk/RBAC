import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UserRole } from '@rbac/shared-types';
import { HttpError } from './http-error';

// Coarse role check — must run after `authenticate`. See docs/ROLE-PERMISSIONS.md §5.
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'Insufficient role'));
      return;
    }
    next();
  };
}
