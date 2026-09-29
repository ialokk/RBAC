import { Routes } from '@angular/router';
import { UserRole } from '@rbac/shared-types';
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  // All authenticated areas render inside the shared shell (header/nav/logout). Child paths and
  // their guards are unchanged — the shell only wraps them.
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'customer',
        canActivate: [authGuard, roleGuard([UserRole.CUSTOMER])],
        loadChildren: () => import('./features/customer/customer.routes').then((m) => m.CUSTOMER_ROUTES),
      },
      {
        path: 'restaurant',
        canActivate: [authGuard, roleGuard([UserRole.RESTAURANT])],
        loadChildren: () => import('./features/restaurant/restaurant.routes').then((m) => m.RESTAURANT_ROUTES),
      },
      {
        path: 'delivery',
        canActivate: [authGuard, roleGuard([UserRole.DELIVERY_PARTNER])],
        loadChildren: () => import('./features/delivery/delivery.routes').then((m) => m.DELIVERY_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [authGuard, roleGuard([UserRole.ADMIN])],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
];
