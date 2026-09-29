import { Schema, model } from 'mongoose';

export interface OfferDocument {
  title: string;
  description?: string;
  imageUrl?: string;
  code?: string;
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
}

const offerSchema = new Schema<OfferDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    code: { type: String, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
  },
  { timestamps: true },
);

export const OfferModel = model<OfferDocument>('Offer', offerSchema);
