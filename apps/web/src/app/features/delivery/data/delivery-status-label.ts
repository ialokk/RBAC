const LABELS: Record<string, string> = {
  OFFERED: 'New Offer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  ARRIVED_AT_RESTAURANT: 'At Restaurant',
  PICKED_UP: 'Picked Up',
  ARRIVED_AT_CUSTOMER: 'At Customer',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export function deliveryStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
