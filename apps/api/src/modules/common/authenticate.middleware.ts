import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@rbac/shared-types';
import { verifyAccessToken } from '../../modules/auth/access-token.util';
import { HttpError } from './http-error';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  permVersion: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Verifies the JWT access token and populates req.user. Never trusts a role/id from the request body.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing bearer token'));
    return;
  }

  try {
    const claims = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: claims.sub, role: claims.role, permVersion: claims.permVersion };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired access token'));
  }
}
