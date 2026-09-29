import { UserRole } from '@rbac/shared-types';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  /** Shown in the mobile bottom bar (customer/delivery); desktop sidebar shows every item. */
  primary?: boolean;
  exact?: boolean;
}

// Mirrors the routes each role's guards already allow — this only controls what is *shown*.
// Angular route guards and backend permissions remain the authoritative access check.
const NAV: Record<UserRole, NavItem[]> = {
  [UserRole.CUSTOMER]: [
    { label: 'Home', path: '/customer/home', icon: 'home', primary: true },
    { label: 'Search', path: '/customer/search', icon: 'search', primary: true },
    { label: 'Orders', path: '/customer/orders', icon: 'receipt', primary: true },
    { label: 'Cart', path: '/customer/cart', icon: 'cart', primary: true },
    { label: 'Profile', path: '/customer/profile', icon: 'user', primary: true },
    { label: 'Addresses', path: '/customer/addresses', icon: 'pin' },
    { label: 'Notifications', path: '/customer/notifications', icon: 'bell' },
  ],
  [UserRole.RESTAURANT]: [
    { label: 'Dashboard', path: '/restaurant/dashboard', icon: 'grid', primary: true },
    { label: 'Orders', path: '/restaurant/orders', icon: 'receipt', primary: true, exact: true },
    { label: 'Menu', path: '/restaurant/menu', icon: 'book', primary: true },
    { label: 'History', path: '/restaurant/orders/history', icon: 'clock' },
    { label: 'Restaurant', path: '/restaurant/profile', icon: 'store', primary: true },
  ],
  [UserRole.DELIVERY_PARTNER]: [
    { label: 'Dashboard', path: '/delivery/dashboard', icon: 'grid', primary: true },
    { label: 'History', path: '/delivery/history', icon: 'clock', primary: true },
    { label: 'Earnings', path: '/delivery/earnings', icon: 'wallet', primary: true },
  ],
  [UserRole.ADMIN]: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'grid' },
    { label: 'Restaurants', path: '/admin/restaurants', icon: 'store' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
    { label: 'Orders', path: '/admin/orders', icon: 'receipt' },
    { label: 'Delivery Partners', path: '/admin/delivery-partners', icon: 'bike' },
    { label: 'Payments', path: '/admin/payments', icon: 'wallet' },
    { label: 'Coupons', path: '/admin/coupons', icon: 'tag' },
    { label: 'Marketing', path: '/admin/marketing', icon: 'megaphone' },
    { label: 'Configuration', path: '/admin/config', icon: 'settings' },
    { label: 'Reports', path: '/admin/reports', icon: 'chart' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'shield' },
  ],
};

export function navForRole(role: UserRole | null): NavItem[] {
  return role ? NAV[role] : [];
}

export function primaryNavForRole(role: UserRole | null): NavItem[] {
  return navForRole(role).filter((item) => item.primary);
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.RESTAURANT]: 'Restaurant',
  [UserRole.DELIVERY_PARTNER]: 'Delivery Partner',
  [UserRole.ADMIN]: 'Admin',
};

export function roleLabel(role: UserRole | null): string {
  return role ? ROLE_LABELS[role] : '';
}
