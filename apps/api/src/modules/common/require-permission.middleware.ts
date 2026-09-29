import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from './http-error';
import { hasPermission, type Permission } from './permissions';
import { UserModel } from '../users/user.model';

// Fine-grained permission check — resolved server-side from role + current DB account status,
// not solely from the JWT claim, so a just-suspended account is rejected immediately.
// See docs/ROLE-PERMISSIONS.md §5 and docs/SECURITY.md §2.
export function requirePermission(permission: Permission): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    try {
      const user = await UserModel.findById(req.user.id);
      if (!user || user.status !== 'ACTIVE') {
        next(new HttpError(403, 'Account is not active'));
        return;
      }
      if (!hasPermission(user.role, permission)) {
        next(new HttpError(403, 'Insufficient permission'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
