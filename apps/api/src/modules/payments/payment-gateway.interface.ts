// Provider-agnostic boundary per docs/SECURITY.md §5 / docs/ARCHITECTURE.md — payments.service.ts
// (business logic) only ever talks to this interface, never to the Razorpay SDK directly. Swapping
// or adding a provider (e.g. Cashfree) means adding a new implementation of this interface only.
export interface CreateGatewayOrderInput {
  amount: number; // minor currency units (paise)
  currency: string;
  receipt: string;
}

export interface GatewayOrder {
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentSignatureInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface RefundInput {
  gatewayPaymentId: string;
  amount: number; // minor currency units, supports partial refunds
  reason: string;
}

export interface GatewayRefund {
  gatewayRefundId: string;
  status: 'processed' | 'pending' | 'failed';
}

export interface PaymentGateway {
  readonly name: 'RAZORPAY';
  createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrder>;
  // Signature returned by the client-side checkout widget — cryptographic proof of a specific
  // gatewayOrderId/gatewayPaymentId pair, verified server-side; never trust the client's claim alone.
  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  refund(input: RefundInput): Promise<GatewayRefund>;
}
