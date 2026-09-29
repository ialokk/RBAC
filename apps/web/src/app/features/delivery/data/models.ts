export interface DeliveryPartnerProfile {
  _id: string;
  personalDetails: { name: string; mobile: string; email?: string; address: string };
  vehicleDetails: { type: string; registrationNumber: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  reviewNotes?: string;
  rating: { avg: number; count: number };
}

export interface AssignmentOrderSummary {
  id: string;
  status: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantAddress?: { line1: string; city: string; state: string; pincode: string };
  deliveryAddressSnapshot: { label: string; line1: string; city: string; state: string; pincode: string };
  pricing: { itemsTotal: number; deliveryCharge: number; taxes: number; discount: number; grandTotal: number };
  itemsCount: number;
}

export type AssignmentStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'ARRIVED_AT_RESTAURANT'
  | 'PICKED_UP'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  status: AssignmentStatus;
  offeredAt: string;
  respondedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  otpVerifiedAt?: string;
  order: AssignmentOrderSummary | null;
}

export interface EarningsSummary {
  perDeliveryRate: number;
  totalDeliveries: number;
  totalEarnings: number;
  today: { deliveries: number; earnings: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
