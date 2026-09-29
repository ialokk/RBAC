import { Routes } from '@angular/router';
import { deliveryApprovedGuard } from './guards/delivery-approved.guard';

export const DELIVERY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'dashboard',
    canActivate: [deliveryApprovedGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'history',
    canActivate: [deliveryApprovedGuard],
    loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
  },
  {
    path: 'earnings',
    canActivate: [deliveryApprovedGuard],
    loadComponent: () => import('./earnings/earnings.component').then((m) => m.EarningsComponent),
  },
];
