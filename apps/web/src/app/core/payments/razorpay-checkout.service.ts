import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config.token';

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayCheckoutRequest {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
}

export interface RazorpaySuccessResponse {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export type RazorpayCheckoutResult =
  | { outcome: 'SUCCESS'; response: RazorpaySuccessResponse }
  | { outcome: 'DISMISSED' }
  | { outcome: 'FAILED'; message: string };

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (payload: { error?: { description?: string; reason?: string } }) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

// The only place that touches the Razorpay browser SDK. Business/HTTP logic stays in
// PaymentsService; this just loads the script on demand and turns the widget's callback-style
// outcomes into a single awaited, discriminated result.
@Injectable({ providedIn: 'root' })
export class RazorpayCheckoutService {
  private readonly config = inject(APP_CONFIG);
  private scriptPromise: Promise<void> | null = null;

  get isConfigured(): boolean {
    return this.config.razorpayKeyId.length > 0;
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if ((window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.scriptPromise = null;
        reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
    return this.scriptPromise;
  }

  // Resolves once the customer has finished with the widget — it never resolves to SUCCESS on its
  // own authority; the caller must still have the backend verify the signature.
  async open(request: RazorpayCheckoutRequest): Promise<RazorpayCheckoutResult> {
    if (!this.isConfigured) {
      throw new Error('Online payment is not configured. Please choose Cash on Delivery.');
    }
    await this.loadScript();

    const Razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (!Razorpay) {
      throw new Error('Could not load the payment gateway. Check your connection and try again.');
    }

    return new Promise<RazorpayCheckoutResult>((resolve) => {
      let settled = false;
      const settle = (result: RazorpayCheckoutResult) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };

      const instance = new Razorpay({
        key: this.config.razorpayKeyId,
        order_id: request.gatewayOrderId,
        amount: request.amount,
        currency: request.currency,
        name: 'RBAC Food Delivery',
        description: request.description,
        prefill: {
          name: request.customerName,
          email: request.customerEmail,
          contact: request.customerContact,
        },
        handler: (response: RazorpayHandlerResponse) =>
          settle({
            outcome: 'SUCCESS',
            response: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          }),
        modal: {
          ondismiss: () => settle({ outcome: 'DISMISSED' }),
        },
      });

      instance.on('payment.failed', (payload) =>
        settle({
          outcome: 'FAILED',
          message: payload.error?.description ?? payload.error?.reason ?? 'Payment failed. Please try again.',
        }),
      );

      instance.open();
    });
  }
}
