import { Schema, model } from 'mongoose';

export interface BannerDocument {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

const bannerSchema = new Schema<BannerDocument>(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BannerModel = model<BannerDocument>('Banner', bannerSchema);
