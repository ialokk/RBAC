import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { RestaurantProfileService } from '../data/restaurant-profile.service';

// Gates dashboard/profile/menu/order routes behind an APPROVED restaurant; PENDING/REJECTED
// accounts are redirected to the onboarding-status page. Backend re-enforces this on every
// request regardless (docs/ROLE-PERMISSIONS.md §5) — this is UX only.
export const restaurantApprovedGuard: CanActivateFn = async () => {
  const profileService = inject(RestaurantProfileService);
  const router = inject(Router);

  const restaurant = await profileService.tryGetOwn();
  if (restaurant) {
    return true;
  }
  return router.createUrlTree(['/restaurant/onboarding']);
};
