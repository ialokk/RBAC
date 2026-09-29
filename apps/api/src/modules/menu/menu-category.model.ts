import { Schema, model } from 'mongoose';

export interface MenuCategoryDocument {
  restaurantId: Schema.Types.ObjectId;
  name: string;
  sortOrder: number;
}

const menuCategorySchema = new Schema<MenuCategoryDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const MenuCategoryModel = model<MenuCategoryDocument>('MenuCategory', menuCategorySchema);
