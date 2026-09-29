import { UserRole } from '@rbac/shared-types';

// Mirrors docs/ROLE-PERMISSIONS.md §3 — permissions relevant to Phase 2 (auth/RBAC), Phase 3
// (customer journey), Phase 4 (restaurant onboarding/dashboard/menu/order workflow), Phase 5
// (delivery partner onboarding/assignments/tracking/earnings) and Phase 6 (order engine
// exception handling: admin cancel/reassign, audit trail).
// Ownership-conditional ("🟡") permissions are still listed here; the service layer enforces the
// ownership condition on top of this coarse allow-list, per docs/ROLE-PERMISSIONS.md §4.
export type Permission =
  | 'auth:login-otp'
  | 'auth:manage-own-sessions'
  | 'profile:read-own'
  | 'profile:update-own'
  | 'address:manage-own'
  | 'cart:manage-own'
  | 'order:create'
  | 'order:read-own'
  | 'order:cancel-own'
  | 'order:accept-reject'
  | 'order:reassign-delivery'
  | 'review:create-own-order'
  | 'coupon:apply'
  | 'notifications:read-own'
  | 'restaurant:apply'
  | 'restaurant:manage-own'
  | 'menu:manage-own'
  | 'approvals:manage'
  | 'delivery:apply'
  | 'delivery:manage-own-status'
  | 'delivery:assignment-accept-decline'
  | 'delivery:update-own-location'
  | 'reports:read'
  | 'users:manage'
  | 'audit-log:read'
  | 'payment:initiate'
  | 'payment:refund'
  | 'payment:read-all'
  | 'payment:reconcile-cod'
  | 'coupon:manage'
  | 'config:manage-platform'
  | 'marketing:manage';

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [UserRole.CUSTOMER]: new Set([
    'auth:login-otp',
    'auth:manage-own-sessions',
    'profile:read-own',
    'profile:update-own',
    'address:manage-own',
    'cart:manage-own',
    'order:create',
    'order:read-own',
    'order:cancel-own',
    'review:create-own-order',
    'coupon:apply',
    'notifications:read-own',
    'restaurant:apply',
    'delivery:apply',
    'payment:initiate',
  ]),
  [UserRole.RESTAURANT]: new Set([
    'auth:login-otp',
    'auth:manage-own-sessions',
    'profile:read-own',
    'profile:update-own',
    'notifications:read-own',
    'restaurant:manage-own',
    'menu:manage-own',
    'order:read-own',
    'order:accept-reject',
    'reports:read',
  ]),
  [UserRole.DELIVERY_PARTNER]: new Set([
    'auth:login-otp',
    'auth:manage-own-sessions',
    'profile:read-own',
    'profile:update-own',
    'notifications:read-own',
    'delivery:manage-own-status',
    'delivery:assignment-accept-decline',
    'delivery:update-own-location',
    'reports:read',
  ]),
  [UserRole.ADMIN]: new Set([
    'auth:login-otp',
    'auth:manage-own-sessions',
    'profile:read-own',
    'profile:update-own',
    'users:manage',
    'audit-log:read',
    'notifications:read-own',
    'approvals:manage',
    'restaurant:manage-own',
    'menu:manage-own',
    'order:read-own',
    'order:accept-reject',
    'order:cancel-own',
    'order:reassign-delivery',
    'delivery:manage-own-status',
    'delivery:assignment-accept-decline',
    'reports:read',
    'payment:refund',
    'payment:read-all',
    'payment:reconcile-cod',
    'coupon:manage',
    'config:manage-platform',
    'marketing:manage',
  ]),
};

// Server-side resolution from role (+ account status upstream), never trusted solely from a JWT claim.
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
