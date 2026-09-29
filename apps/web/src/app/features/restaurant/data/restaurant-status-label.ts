// Operational wording for the restaurant console — the same backend statuses read differently to
// a kitchen than they do to a customer (e.g. RESTAURANT_PENDING is "New order", not "Sent to restaurant").
const LABELS: Record<string, string> = {
  RESTAURANT_PENDING: 'New order',
  RESTAURANT_ACCEPTED: 'Accepted',
  RESTAURANT_REJECTED: 'Rejected',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERY_ASSIGNED: 'Finding partner',
  DELIVERY_ACCEPTED: 'Partner assigned',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CUSTOMER_CANCELLED: 'Cancelled by customer',
  RESTAURANT_CANCELLED: 'Cancelled',
  DELIVERY_CANCELLED: 'Delivery cancelled',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
  PAYMENT_FAILED: 'Payment failed',
};

export function restaurantStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
