// Customer-facing wording for order statuses. Internal matching details (partner ids, retry
// counts, matching errors) must never reach the customer — while the backend is still retrying
// delivery-partner assignment the order sits at READY_FOR_PICKUP, which reads as "finding a
// delivery partner" rather than any kind of failure.
const ORDER_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Order created',
  PAYMENT_PENDING: 'Awaiting payment',
  PAYMENT_FAILED: 'Payment failed',
  PAID: 'Payment confirmed',
  RESTAURANT_PENDING: 'Sent to restaurant',
  RESTAURANT_ACCEPTED: 'Restaurant accepted your order',
  RESTAURANT_REJECTED: 'Restaurant could not accept your order',
  PREPARING: 'Preparing your food',
  READY_FOR_PICKUP: 'Food is ready — finding a delivery partner',
  DELIVERY_ASSIGNED: 'Finding a delivery partner',
  DELIVERY_ACCEPTED: 'Delivery partner assigned',
  PICKED_UP: 'Picked up from the restaurant',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CUSTOMER_CANCELLED: 'Cancelled',
  RESTAURANT_CANCELLED: 'Cancelled by the restaurant',
  DELIVERY_CANCELLED: "Cancelled — we couldn't find a delivery partner",
  REFUND_PENDING: 'Refund in progress',
  REFUNDED: 'Refunded',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
