export interface RestaurantApplication {
  _id: string;
  applicantUserId: string;
  ownerDetails: { name: string; mobile: string; email?: string; idProof?: string };
  restaurantDetails: { name: string; cuisines: string[]; description?: string };
  address: { line1: string; city: string; state: string; pincode: string };
  documents: { type: string; url: string }[];
  bankDetails: { accountNumber: string; ifsc: string; accountHolder: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  createdAt: string;
}

export interface OwnRestaurant {
  _id: string;
  name: string;
  description?: string;
  cuisines: string[];
  address: { line1: string; city: string; state: string; pincode: string };
  status: 'APPROVED' | 'SUSPENDED';
  isOpen: boolean;
  avgPrepTimeMinutes: number;
  rating: { avg: number; count: number };
}

export interface MenuCategory {
  _id: string;
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

export interface RestaurantOrder {
  _id: string;
  customerId: string;
  items: {
    menuItemId: string;
    nameSnapshot: string;
    priceSnapshot: number;
    qty: number;
    instructions?: string;
  }[];
  deliveryAddressSnapshot: { label: string; line1: string; city: string; state: string; pincode: string };
  pricing: { itemsTotal: number; deliveryCharge: number; taxes: number; discount: number; grandTotal: number };
  paymentMethod: string;
  status: string;
  prepTimeMinutes?: number;
  createdAt: string;
}

export interface DashboardSummary {
  today: { totalOrders: number; revenue: number };
  pending: number;
  accepted: number;
  preparing: number;
  ready: number;
  completed: number;
  cancelled: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
