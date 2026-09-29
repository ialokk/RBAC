import { UserRole } from '@rbac/shared-types';
import { hasPermission } from '../../src/modules/common/permissions';

describe('hasPermission (unit) — docs/ROLE-PERMISSIONS.md §3 matrix spot-checks', () => {
  it('grants CUSTOMER order:create and payment:initiate, denies admin-only actions', () => {
    expect(hasPermission(UserRole.CUSTOMER, 'order:create')).toBe(true);
    expect(hasPermission(UserRole.CUSTOMER, 'payment:initiate')).toBe(true);
    expect(hasPermission(UserRole.CUSTOMER, 'payment:refund')).toBe(false);
    expect(hasPermission(UserRole.CUSTOMER, 'users:manage')).toBe(false);
  });

  it('grants RESTAURANT order:accept-reject but not order:reassign-delivery', () => {
    expect(hasPermission(UserRole.RESTAURANT, 'order:accept-reject')).toBe(true);
    expect(hasPermission(UserRole.RESTAURANT, 'order:reassign-delivery')).toBe(false);
  });

  it('grants DELIVERY_PARTNER assignment/location permissions but not payment:refund', () => {
    expect(hasPermission(UserRole.DELIVERY_PARTNER, 'delivery:assignment-accept-decline')).toBe(true);
    expect(hasPermission(UserRole.DELIVERY_PARTNER, 'delivery:update-own-location')).toBe(true);
    expect(hasPermission(UserRole.DELIVERY_PARTNER, 'payment:refund')).toBe(false);
  });

  it('grants ADMIN every admin-only permission', () => {
    for (const permission of [
      'users:manage',
      'audit-log:read',
      'approvals:manage',
      'order:reassign-delivery',
      'order:cancel-own',
      'payment:refund',
      'payment:read-all',
      'payment:reconcile-cod',
      'coupon:manage',
      'config:manage-platform',
      'marketing:manage',
    ] as const) {
      expect(hasPermission(UserRole.ADMIN, permission)).toBe(true);
    }
  });

  it('never grants a CUSTOMER any ADMIN-only permission', () => {
    for (const permission of ['users:manage', 'payment:refund', 'coupon:manage', 'config:manage-platform'] as const) {
      expect(hasPermission(UserRole.CUSTOMER, permission)).toBe(false);
    }
  });
});
