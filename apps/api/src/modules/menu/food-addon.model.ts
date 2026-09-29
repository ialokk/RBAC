import { Schema, model } from 'mongoose';

export interface FoodAddonOption {
  name: string;
  price: number;
}

export interface FoodAddonDocument {
  restaurantId: Schema.Types.ObjectId;
  groupName: string;
  options: FoodAddonOption[];
  maxSelectable: number;
}

const foodAddonSchema = new Schema<FoodAddonDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    groupName: { type: String, required: true, trim: true, maxlength: 100 },
    options: {
      type: [{ name: { type: String, required: true }, price: { type: Number, required: true, min: 0 } }],
      default: [],
    },
    maxSelectable: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const FoodAddonModel = model<FoodAddonDocument>('FoodAddon', foodAddonSchema);
