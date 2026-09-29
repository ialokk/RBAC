import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import {
  RazorpayCheckoutService,
  type RazorpayCheckoutResult,
  type RazorpaySuccessResponse,
} from '../../../core/payments/razorpay-checkout.service';
import type { OnlinePaymentMethod, PaymentInitiation, PaymentRecord } from './models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly razorpay = inject(RazorpayCheckoutService);

  get isOnlinePaymentConfigured(): boolean {
    return this.razorpay.isConfigured;
  }

  initiatePayment(orderId: string, method: OnlinePaymentMethod): Promise<PaymentInitiation> {
    return firstValueFrom(
      this.http.post<PaymentInitiation>(`${this.config.apiBaseUrl}/payments/initiate`, { orderId, method }),
    );
  }

  openCheckout(initiation: PaymentInitiation, description?: string): Promise<RazorpayCheckoutResult> {
    return this.razorpay.open({
      gatewayOrderId: initiation.gatewayOrderId,
      amount: initiation.amount,
      currency: initiation.currency,
      description,
    });
  }

  // The gateway's client-side "success" is only a hint — this is the call that actually decides,
  // because the backend re-verifies the HMAC signature before moving the order to PAID.
  verifyPayment(orderId: string, response: RazorpaySuccessResponse): Promise<PaymentRecord> {
    return firstValueFrom(this.http.post<PaymentRecord>(`${this.config.apiBaseUrl}/payments/${orderId}/verify`, response));
  }

  getPaymentStatus(orderId: string): Promise<PaymentRecord> {
    return firstValueFrom(this.http.get<PaymentRecord>(`${this.config.apiBaseUrl}/payments/${orderId}/status`));
  }
}
