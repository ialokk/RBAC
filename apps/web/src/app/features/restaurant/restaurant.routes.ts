import { Routes } from '@angular/router';
import { restaurantApprovedGuard } from './guards/restaurant-approved.guard';

export const RESTAURANT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'dashboard',
    canActivate: [restaurantApprovedGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'profile',
    canActivate: [restaurantApprovedGuard],
    loadComponent: () => import('./profile/restaurant-profile.component').then((m) => m.RestaurantProfileComponent),
  },
  {
    path: 'menu',
    canActivate: [restaurantApprovedGuard],
    loadComponent: () => import('./menu/menu-management.component').then((m) => m.MenuManagementComponent),
  },
  {
    path: 'orders',
    canActivate: [restaurantApprovedGuard],
    data: { mode: 'active' },
    loadComponent: () => import('./orders/order-list.component').then((m) => m.OrderListComponent),
  },
  {
    path: 'orders/history',
    canActivate: [restaurantApprovedGuard],
    data: { mode: 'history' },
    loadComponent: () => import('./orders/order-list.component').then((m) => m.OrderListComponent),
  },
];
