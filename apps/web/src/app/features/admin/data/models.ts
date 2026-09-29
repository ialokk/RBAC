export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  _id: string;
  role: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY_PARTNER' | 'ADMIN';
  name?: string;
  mobile?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface AdminRestaurant {
  _id: string;
  name: string;
  cuisines: string[];
  status: 'APPROVED' | 'SUSPENDED';
  isOpen: boolean;
  rating?: { avg: number; count: number };
  createdAt: string;
}

export interface RestaurantApplication {
  _id: string;
  applicantUserId: string;
  ownerDetails: { name: string; mobile: string };
  restaurantDetails: { name: string; cuisines: string[] };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  createdAt: string;
}

export interface AdminDeliveryPartner {
  _id: string;
  userId: string;
  personalDetails: { name: string; mobile: string };
  vehicleDetails: { type: string; registrationNumber: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  createdAt: string;
}

export interface AdminOrder {
  _id: string;
  customerId: string;
  restaurantId: string;
  status: string;
  paymentMethod: string;
  pricing: { itemsTotal: number; deliveryCharge: number; taxes: number; discount: number; grandTotal: number };
  createdAt: string;
}

export interface AdminPayment {
  _id: string;
  orderId: string;
  gateway: string;
  method: string;
  amount: number;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  validFrom: string;
  validTo: string;
  usageLimitPerUser: number;
  totalUsageLimit: number;
  applicableRestaurantIds: string[];
  isActive: boolean;
}

export interface ServiceZone {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface PlatformConfig {
  deliveryChargeMinor: number;
  taxPercent: number;
  minOrderValueMinor: number;
  deliveryPartnerEarningMinor: number;
  commissionPercent: number;
  cancellationWindowMinutes: number;
  serviceZones: ServiceZone[];
}

export interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Offer {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  code?: string;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface AuditLogEntry {
  _id: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  customers: number;
  restaurants: number;
  deliveryPartners: number;
  pendingApprovals: { restaurants: number; deliveryPartners: number };
  activeDeliveries: number;
  today: { totalOrders: number; revenue: number };
}
