import { Schema, model, Types, type HydratedDocument } from 'mongoose';

// Mirrors docs/ERD.md §2.13. This collection is the sole source of truth for payment/refund state —
// order.status (PAYMENT_PENDING/PAID/PAYMENT_FAILED/REFUND_PENDING/REFUNDED) is kept in lockstep by
// orders.service (markPaid/markPaymentFailed/markRefunded), never set directly from here.
export type PaymentGatewayName = 'RAZORPAY' | 'COD';
export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
export type PaymentRefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface PaymentRefundEntry {
  amount: number;
  reason: string;
  gatewayRefundId?: string;
  status: PaymentRefundStatus;
  at: Date;
}

export interface PaymentDocument {
  orderId: Schema.Types.ObjectId;
  gateway: PaymentGatewayName;
  method: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number;
  status: PaymentStatus;
  failureReason?: string;
  webhookEventIds: string[];
  verifiedAt?: Date;
  refunds: Types.DocumentArray<PaymentRefundEntry>;
}

export type PaymentHydratedDocument = HydratedDocument<PaymentDocument>;

const refundSchema = new Schema<PaymentRefundEntry>(
  {
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    gatewayRefundId: { type: String },
    status: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'], required: true },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const paymentSchema = new Schema<PaymentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    gateway: { type: String, enum: ['RAZORPAY', 'COD'], required: true },
    method: { type: String, enum: ['UPI', 'CARD', 'NETBANKING', 'COD'], required: true },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['INITIATED', 'SUCCESS', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
      default: 'INITIATED',
      index: true,
    },
    failureReason: { type: String },
    webhookEventIds: { type: [String], default: [] },
    verifiedAt: { type: Date },
    refunds: { type: [refundSchema], default: [] },
  },
  { timestamps: true },
);

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
