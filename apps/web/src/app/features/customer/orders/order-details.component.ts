import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { OrdersService } from '../data/orders.service';
import { PaymentsService } from '../data/payments.service';
import { orderStatusLabel } from '../data/order-status-label';
import type { Order, OnlinePaymentMethod } from '../data/models';

const CANCELLABLE_STATUSES = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'RESTAURANT_PENDING', 'RESTAURANT_ACCEPTED'];

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.component.html',
})
export class OrderDetailsComponent implements OnInit {
  readonly statusLabel = orderStatusLabel;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly paymentsService = inject(PaymentsService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly cancelling = signal(false);
  readonly reordering = signal(false);
  readonly paying = signal(false);
  readonly message = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    try {
      this.order.set(await this.ordersService.getById(id));
    } finally {
      this.loading.set(false);
    }
  }

  canCancel(): boolean {
    const order = this.order();
    return !!order && CANCELLABLE_STATUSES.includes(order.status);
  }

  // An order can be left at PAYMENT_PENDING by a refresh, a dismissed gateway widget or a dropped
  // network call — let the customer finish paying the SAME order rather than starting a new one.
  canResumePayment(): boolean {
    const order = this.order();
    return (
      !!order &&
      order.status === 'PAYMENT_PENDING' &&
      order.paymentMethod !== 'COD' &&
      this.paymentsService.isOnlinePaymentConfigured
    );
  }

  async resumePayment(): Promise<void> {
    const order = this.order();
    if (!order || this.paying()) return;
    this.paying.set(true);
    this.message.set(null);
    try {
      const initiation = await this.paymentsService.initiatePayment(
        order._id,
        order.paymentMethod as OnlinePaymentMethod,
      );
      const result = await this.paymentsService.openCheckout(initiation, 'Food order payment');
      if (result.outcome === 'DISMISSED') {
        this.message.set('Payment was cancelled. You can retry whenever you are ready.');
        return;
      }
      if (result.outcome === 'FAILED') {
        this.message.set(result.message);
        return;
      }
      await this.paymentsService.verifyPayment(order._id, result.response);
      this.message.set('Payment confirmed.');
    } catch {
      // Backend (verify endpoint + signed webhook) owns the real outcome; just re-read it.
      this.message.set('We could not confirm your payment here. Refreshing the latest order status…');
    } finally {
      this.paying.set(false);
      await this.load();
    }
  }

  async cancelOrder(): Promise<void> {
    const order = this.order();
    if (!order) return;
    this.cancelling.set(true);
    try {
      this.order.set(await this.ordersService.cancel(order._id, 'Cancelled by customer'));
    } finally {
      this.cancelling.set(false);
    }
  }

  async reorder(): Promise<void> {
    const order = this.order();
    if (!order) return;
    this.reordering.set(true);
    try {
      const result = await this.ordersService.reorder(order._id);
      this.message.set(
        result.skippedItems.length > 0
          ? `Added to cart. Unavailable and skipped: ${result.skippedItems.join(', ')}`
          : 'Added to cart.',
      );
      await this.router.navigateByUrl('/customer/cart');
    } finally {
      this.reordering.set(false);
    }
  }
}
