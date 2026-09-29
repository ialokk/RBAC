import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.AdminDashboardComponent) },
  { path: 'users', loadComponent: () => import('./users/users.component').then((m) => m.AdminUsersComponent) },
  {
    path: 'restaurants',
    loadComponent: () => import('./restaurants/restaurants.component').then((m) => m.AdminRestaurantsComponent),
  },
  {
    path: 'delivery-partners',
    loadComponent: () => import('./delivery/delivery-partners.component').then((m) => m.AdminDeliveryPartnersComponent),
  },
  { path: 'orders', loadComponent: () => import('./orders/orders.component').then((m) => m.AdminOrdersComponent) },
  { path: 'payments', loadComponent: () => import('./payments/payments.component').then((m) => m.AdminPaymentsComponent) },
  { path: 'coupons', loadComponent: () => import('./coupons/coupons.component').then((m) => m.AdminCouponsComponent) },
  { path: 'config', loadComponent: () => import('./config/config.component').then((m) => m.AdminConfigComponent) },
  { path: 'marketing', loadComponent: () => import('./marketing/marketing.component').then((m) => m.AdminMarketingComponent) },
  { path: 'reports', loadComponent: () => import('./reports/reports.component').then((m) => m.AdminReportsComponent) },
  {
    path: 'audit-logs',
    loadComponent: () => import('./audit-logs/audit-logs.component').then((m) => m.AdminAuditLogsComponent),
  },
];
