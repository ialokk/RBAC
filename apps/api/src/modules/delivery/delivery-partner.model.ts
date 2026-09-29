import { Schema, model } from 'mongoose';

export interface DeliveryPartnerDocument {
  userId: Schema.Types.ObjectId;
  personalDetails: { name: string; mobile: string; email?: string; address: string };
  vehicleDetails: { type: string; registrationNumber: string };
  documents: { type: string; url: string }[];
  bankDetails: { accountNumber: string; ifsc: string; accountHolder: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentLocation?: { type: 'Point'; coordinates: [number, number] };
  rating: { avg: number; count: number };
  reviewedBy?: Schema.Types.ObjectId;
  reviewNotes?: string;
}

const deliveryPartnerSchema = new Schema<DeliveryPartnerDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    personalDetails: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
    },
    vehicleDetails: {
      type: { type: String, required: true },
      registrationNumber: { type: String, required: true },
    },
    documents: {
      type: [{ type: { type: String, required: true }, url: { type: String, required: true } }],
      default: [],
    },
    bankDetails: {
      accountNumber: { type: String, required: true },
      ifsc: { type: String, required: true },
      accountHolder: { type: String, required: true },
    },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], default: 'PENDING', index: true },
    // Only meaningful once APPROVED; defaults OFFLINE until the partner explicitly goes online.
    availability: { type: String, enum: ['AVAILABLE', 'BUSY', 'OFFLINE'], default: 'OFFLINE' },
    currentLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

export const DeliveryPartnerModel = model<DeliveryPartnerDocument>('DeliveryPartner', deliveryPartnerSchema);
