import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { DeliveryApplicationService } from '../data/delivery-application.service';

// Gates dashboard/history/earnings routes behind an APPROVED delivery partner profile;
// PENDING/REJECTED/SUSPENDED accounts are redirected to the onboarding-status page. Backend
// re-enforces this on every request regardless (docs/ROLE-PERMISSIONS.md §5) — this is UX only.
export const deliveryApprovedGuard: CanActivateFn = async () => {
  const applicationService = inject(DeliveryApplicationService);
  const router = inject(Router);

  const application = await applicationService.getOwn();
  if (application?.status === 'APPROVED') {
    return true;
  }
  return router.createUrlTree(['/delivery/onboarding']);
};
