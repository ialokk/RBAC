export interface Restaurant {
  _id: string;
  name: string;
  description?: string;
  cuisines: string[];
  address: { line1: string; city: string; state: string; pincode: string };
  isOpen: boolean;
  avgPrepTimeMinutes: number;
  rating: { avg: number; count: number };
}

export interface MenuCategory {
  _id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface MenuItemVariation {
  name: string;
  priceDelta: number;
}

export interface FoodAddonOption {
  name: string;
  price: number;
}

export interface FoodAddonGroup {
  _id: string;
  groupName: string;
  options: FoodAddonOption[];
  maxSelectable: number;
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  isVeg: boolean;
  isAvailable: boolean;
  variations: MenuItemVariation[];
  addonGroupIds: string[];
  prepTimeMinutes: number;
}

export interface CartItem {
  _id: string;
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  selectedVariation?: { name: string; priceDelta: number };
  selectedAddons: FoodAddonOption[];
  instructions?: string;
}

export interface Cart {
  _id: string;
  restaurantId?: string;
  items: CartItem[];
  couponCode?: string;
}

export interface PricingBreakdown {
  itemsTotal: number;
  deliveryCharge: number;
  taxes: number;
  discount: number;
  grandTotal: number;
}

export interface Address {
  _id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'COD';

export type OnlinePaymentMethod = Exclude<PaymentMethod, 'COD'>;

// Response of POST /payments/initiate — `amount` is in minor units, as everywhere else.
export interface PaymentInitiation {
  paymentId: string;
  gateway: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

export interface PaymentRecord {
  _id: string;
  orderId: string;
  gateway: string;
  method: string;
  amount: number;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
  failureReason?: string;
}

export interface OrderItemSnapshot {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  variationSnapshot?: { name: string; priceDelta: number };
  addonsSnapshot: FoodAddonOption[];
  instructions?: string;
}

export interface OrderStatusHistoryEntry {
  status: string;
  at: string;
  actorRole: string;
  reason?: string;
}

export interface Order {
  _id: string;
  restaurantId: string;
  items: OrderItemSnapshot[];
  deliveryAddressSnapshot: { label: string; line1: string; city: string; state: string; pincode: string };
  pricing: PricingBreakdown;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  status: string;
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
}

export interface OrderTracking {
  orderId: string;
  status: string;
  statusHistory: OrderStatusHistoryEntry[];
  assignedDeliveryPartnerId: string | null;
  assignmentId: string | null;
  partnerLocation: { lat: number; lng: number } | null;
}

export interface Coupon {
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
}

export interface Review {
  _id: string;
  orderId: string;
  restaurantId: string;
  rating: number;
  comment?: string;
  deliveryPartnerRating?: number;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';
  type: string;
  payload: Record<string, unknown>;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  readAt?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
