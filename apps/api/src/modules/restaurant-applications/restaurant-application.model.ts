import { Schema, model } from 'mongoose';

export interface RestaurantApplicationDocument {
  applicantUserId: Schema.Types.ObjectId;
  ownerDetails: { name: string; mobile: string; email?: string; idProof?: string };
  restaurantDetails: { name: string; cuisines: string[]; description?: string };
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
    geo?: { type: 'Point'; coordinates: [number, number] };
  };
  documents: { type: string; url: string }[];
  bankDetails: { accountNumber: string; ifsc: string; accountHolder: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: Schema.Types.ObjectId;
  reviewNotes?: string;
}

const restaurantApplicationSchema = new Schema<RestaurantApplicationDocument>(
  {
    applicantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerDetails: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      email: { type: String },
      idProof: { type: String },
    },
    restaurantDetails: {
      name: { type: String, required: true },
      cuisines: { type: [String], default: [] },
      description: { type: String, maxlength: 2000 },
    },
    address: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      geo: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined },
      },
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
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

export const RestaurantApplicationModel = model<RestaurantApplicationDocument>(
  'RestaurantApplication',
  restaurantApplicationSchema,
);
