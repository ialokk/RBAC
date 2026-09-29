import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

// Maps backend order statuses to a badge tone so every role's UI colours them identically.
const TONES: Record<string, StatusTone> = {
  CREATED: 'neutral',
  PAYMENT_PENDING: 'warning',
  PAYMENT_FAILED: 'danger',
  PAID: 'info',
  RESTAURANT_PENDING: 'warning',
  RESTAURANT_ACCEPTED: 'info',
  RESTAURANT_REJECTED: 'danger',
  PREPARING: 'primary',
  READY_FOR_PICKUP: 'primary',
  DELIVERY_ASSIGNED: 'info',
  DELIVERY_ACCEPTED: 'info',
  PICKED_UP: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CUSTOMER_CANCELLED: 'danger',
  RESTAURANT_CANCELLED: 'danger',
  DELIVERY_CANCELLED: 'danger',
  REFUND_PENDING: 'warning',
  REFUNDED: 'neutral',
};

export function toneForStatus(status: string): StatusTone {
  return TONES[status] ?? 'neutral';
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="cssClass()">{{ label() }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
  readonly cssClass = computed(() => (this.tone() === 'neutral' ? '' : `badge-${this.tone()}`));
}
