import { Schema, model } from 'mongoose';
import { OrderStatus, UserRole } from '@rbac/shared-types';

export interface OrderItemSnapshot {
  menuItemId: Schema.Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  variationSnapshot?: { name: string; priceDelta: number };
  addonsSnapshot: { name: string; price: number }[];
  instructions?: string;
}

export interface OrderPricing {
  itemsTotal: number;
  deliveryCharge: number;
  taxes: number;
  discount: number;
  grandTotal: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  at: Date;
  actorRole: UserRole | 'SYSTEM';
  actorId?: Schema.Types.ObjectId;
  reason?: string;
}

export interface OrderDocument {
  customerId: Schema.Types.ObjectId;
  restaurantId: Schema.Types.ObjectId;
  items: OrderItemSnapshot[];
  deliveryAddressSnapshot: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  pricing: OrderPricing;
  couponCode?: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  assignedDeliveryPartnerId?: Schema.Types.ObjectId;
  deliveryOtpHash?: string;
  // Counts partner-matching ROUNDS, not offer documents — one round may offer to several partners.
  deliveryAssignmentAttempts: number;
  // `cancelledBy` is absent for automatic SYSTEM cancellations (e.g. no delivery partner found).
  cancellation?: { cancelledBy?: Schema.Types.ObjectId; reason: string; at: Date };
  prepTimeMinutes?: number;
  rejection?: { reason: string; at: Date };
}

const orderSchema = new Schema<OrderDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    items: {
      type: [
        {
          menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
          nameSnapshot: { type: String, required: true },
          priceSnapshot: { type: Number, required: true },
          qty: { type: Number, required: true },
          variationSnapshot: { name: { type: String }, priceDelta: { type: Number } },
          addonsSnapshot: {
            type: [{ name: { type: String, required: true }, price: { type: Number, required: true } }],
            default: [],
          },
          instructions: { type: String },
        },
      ],
      required: true,
    },
    deliveryAddressSnapshot: {
      label: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    pricing: {
      itemsTotal: { type: Number, required: true },
      deliveryCharge: { type: Number, required: true },
      taxes: { type: Number, required: true },
      discount: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
    },
    couponCode: { type: String },
    paymentMethod: { type: String, enum: ['UPI', 'CARD', 'NETBANKING', 'COD'], required: true },
    status: { type: String, enum: Object.values(OrderStatus), required: true, default: OrderStatus.CREATED, index: true },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: Object.values(OrderStatus), required: true },
          at: { type: Date, required: true },
          actorRole: { type: String, required: true },
          actorId: { type: Schema.Types.ObjectId, ref: 'User' },
          reason: { type: String },
        },
      ],
      default: [],
    },
    assignedDeliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    deliveryOtpHash: { type: String },
    deliveryAssignmentAttempts: { type: Number, default: 0 },
    cancellation: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      at: { type: Date },
    },
    prepTimeMinutes: { type: Number },
    rejection: {
      reason: { type: String },
      at: { type: Date },
    },
  },
  { timestamps: true },
);

export const OrderModel = model<OrderDocument>('Order', orderSchema);
