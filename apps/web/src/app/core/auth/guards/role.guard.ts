import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { UserRole } from '@rbac/shared-types';
import { AuthService } from '../auth.service';

// Coarse client-side UX gate only — the backend's requireRole middleware is the real authority.
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.role();
    if (role && allowedRoles.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/auth']);
  };
}
