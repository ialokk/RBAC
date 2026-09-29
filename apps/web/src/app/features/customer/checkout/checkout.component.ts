import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AddressesService } from '../data/addresses.service';
import { CartStateService } from '../data/cart-state.service';
import { OrdersService } from '../data/orders.service';
import { PaymentsService } from '../data/payments.service';
import type { Address, OnlinePaymentMethod, PaymentMethod, PricingBreakdown } from '../data/models';

interface PaymentOption {
  method: PaymentMethod;
  label: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { method: 'COD', label: 'Cash on Delivery' },
  { method: 'UPI', label: 'UPI' },
  { method: 'CARD', label: 'Card' },
  { method: 'NETBANKING', label: 'Net Banking' },
];

type CheckoutStage = 'IDLE' | 'CREATING_ORDER' | 'AWAITING_GATEWAY' | 'VERIFYING';
type CheckoutOutcome = 'CANCELLED' | 'FAILED' | 'PENDING_CONFIRMATION';

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Object && 'error' in err) {
    const message = (err as { error?: { message?: string } }).error?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

import { BackButtonComponent } from '../../../shared/ui/back-button/back-button.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit {
  private readonly addressesService = inject(AddressesService);
  private readonly cartState = inject(CartStateService);
  private readonly ordersService = inject(OrdersService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly router = inject(Router);

  readonly paymentOptions = PAYMENT_OPTIONS;
  readonly addresses = signal<Address[]>([]);
  readonly selectedAddressId = signal<string | null>(null);
  readonly selectedMethod = signal<PaymentMethod>('COD');
  readonly pricing = signal<PricingBreakdown | null>(null);
  readonly stage = signal<CheckoutStage>('IDLE');
  readonly outcome = signal<CheckoutOutcome | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Retained across retries so a second "Pay now" resumes payment for the SAME order instead of
  // creating a duplicate one.
  readonly pendingOrderId = signal<string | null>(null);

  readonly onlinePaymentAvailable = this.paymentsService.isOnlinePaymentConfigured;

  async ngOnInit(): Promise<void> {
    const [addresses] = await Promise.all([this.addressesService.list(), this.cartState.load()]);
    this.addresses.set(addresses.items);
    const defaultAddress = addresses.items.find((a) => a.isDefault) ?? addresses.items[0];
    if (defaultAddress) {
      this.selectedAddressId.set(defaultAddress._id);
    }
    if (this.cartState.cart().items.length > 0) {
      this.pricing.set(await this.cartState.checkoutPreview());
    }
  }

  isMethodAvailable(method: PaymentMethod): boolean {
    return method === 'COD' || this.onlinePaymentAvailable;
  }

  isBusy(): boolean {
    return this.stage() !== 'IDLE';
  }

  submitLabel(): string {
    switch (this.stage()) {
      case 'CREATING_ORDER':
        return 'Creating your order…';
      case 'AWAITING_GATEWAY':
        return 'Waiting for payment…';
      case 'VERIFYING':
        return 'Confirming payment…';
      default:
        break;
    }
    if (this.selectedMethod() === 'COD') {
      return 'Place order';
    }
    return this.pendingOrderId() ? 'Retry payment' : 'Pay now';
  }

  async submit(): Promise<void> {
    if (this.isBusy()) {
      return;
    }
    const addressId = this.selectedAddressId();
    if (!addressId) {
      this.errorMessage.set('Please select a delivery address');
      return;
    }
    this.errorMessage.set(null);
    this.outcome.set(null);

    const method = this.selectedMethod();
    try {
      this.stage.set('CREATING_ORDER');
      const orderId = this.pendingOrderId() ?? (await this.ordersService.place(addressId, method))._id;
      this.pendingOrderId.set(orderId);

      if (method === 'COD') {
        await this.finish(orderId);
        return;
      }

      await this.payOnline(orderId, method);
    } catch (err) {
      this.errorMessage.set(apiErrorMessage(err, 'Could not place order. Please try again.'));
    } finally {
      this.stage.set('IDLE');
    }
  }

  private async payOnline(orderId: string, method: OnlinePaymentMethod): Promise<void> {
    const initiation = await this.paymentsService.initiatePayment(orderId, method);

    this.stage.set('AWAITING_GATEWAY');
    const result = await this.paymentsService.openCheckout(initiation, 'Food order payment');

    if (result.outcome === 'DISMISSED') {
      this.outcome.set('CANCELLED');
      this.errorMessage.set('Payment was cancelled. Your order is saved — you can retry payment.');
      return;
    }
    if (result.outcome === 'FAILED') {
      this.outcome.set('FAILED');
      this.errorMessage.set(result.message);
      return;
    }

    this.stage.set('VERIFYING');
    try {
      await this.paymentsService.verifyPayment(orderId, result.response);
    } catch (verifyErr) {
      // The gateway said success but our verify call didn't get through (or was rejected). The
      // backend — via this status read, and via the signed webhook — is the authority, so ask it
      // rather than assuming either outcome.
      const confirmed = await this.isPaymentConfirmed(orderId);
      if (!confirmed) {
        this.outcome.set('PENDING_CONFIRMATION');
        this.errorMessage.set(
          apiErrorMessage(
            verifyErr,
            'We could not confirm your payment yet. Check the order page in a moment before paying again.',
          ),
        );
        return;
      }
    }

    await this.finish(orderId);
  }

  private async isPaymentConfirmed(orderId: string): Promise<boolean> {
    try {
      const payment = await this.paymentsService.getPaymentStatus(orderId);
      return payment.status === 'SUCCESS';
    } catch {
      return false;
    }
  }

  private async finish(orderId: string): Promise<void> {
    this.cartState.clearLocal();
    this.pendingOrderId.set(null);
    await this.router.navigateByUrl(`/customer/orders/${orderId}`);
  }
}
