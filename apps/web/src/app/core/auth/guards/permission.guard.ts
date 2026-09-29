import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../auth.service';

// Foundation only — real permission resolution is server-side; extended once fine-grained,
// role-independent permissions need client-side UX gating (e.g. hiding actions within a role area).
export function permissionGuard(check: (roleContext: ReturnType<AuthService['role']>) => boolean): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated() && check(authService.role())) {
      return true;
    }
    return router.createUrlTree(['/auth']);
  };
}
