import { Schema, model, type HydratedDocument } from 'mongoose';

export interface DeliveryAssignmentDocument {
  orderId: Schema.Types.ObjectId;
  partnerId: Schema.Types.ObjectId;
  status: 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'ARRIVED_AT_RESTAURANT' | 'PICKED_UP' | 'ARRIVED_AT_CUSTOMER' | 'DELIVERED' | 'CANCELLED';
  offeredAt: Date;
  respondedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  otpVerifiedAt?: Date;
}

const deliveryAssignmentSchema = new Schema<DeliveryAssignmentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
    status: {
      type: String,
      enum: ['OFFERED', 'ACCEPTED', 'DECLINED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER', 'DELIVERED', 'CANCELLED'],
      default: 'OFFERED',
      index: true,
    },
    offeredAt: { type: Date, required: true, default: Date.now },
    respondedAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    otpVerifiedAt: { type: Date },
  },
  { timestamps: true },
);

export const DeliveryAssignmentModel = model<DeliveryAssignmentDocument>('DeliveryAssignment', deliveryAssignmentSchema);
export type DeliveryAssignmentHydratedDocument = HydratedDocument<DeliveryAssignmentDocument>;
