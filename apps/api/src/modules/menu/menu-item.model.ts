import { Schema, model } from 'mongoose';

export interface MenuItemVariation {
  name: string;
  priceDelta: number;
}

export interface MenuItemDocument {
  restaurantId: Schema.Types.ObjectId;
  categoryId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  images: string[];
  isVeg: boolean;
  isAvailable: boolean;
  variations: MenuItemVariation[];
  addonGroupIds: Schema.Types.ObjectId[];
  prepTimeMinutes: number;
}

const menuItemSchema = new Schema<MenuItemDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    variations: {
      type: [{ name: { type: String, required: true }, priceDelta: { type: Number, required: true } }],
      default: [],
    },
    addonGroupIds: { type: [Schema.Types.ObjectId], ref: 'FoodAddon', default: [] },
    prepTimeMinutes: { type: Number, default: 15 },
  },
  { timestamps: true },
);

menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuItemModel = model<MenuItemDocument>('MenuItem', menuItemSchema);
