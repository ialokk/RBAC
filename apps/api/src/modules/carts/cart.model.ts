import { Schema, Types, model } from 'mongoose';

export interface CartAddonSnapshot {
  name: string;
  price: number;
}

export interface CartItem {
  _id?: Types.ObjectId;
  menuItemId: Schema.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  selectedVariation?: { name: string; priceDelta: number };
  selectedAddons: CartAddonSnapshot[];
  instructions?: string;
}

export interface CartDocument {
  userId: Schema.Types.ObjectId;
  restaurantId?: Schema.Types.ObjectId;
  items: Types.DocumentArray<CartItem>;
  couponCode?: string;
}

const cartSchema = new Schema<CartDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    items: {
      type: [
        {
          menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          qty: { type: Number, required: true, min: 1 },
          selectedVariation: {
            name: { type: String },
            priceDelta: { type: Number },
          },
          selectedAddons: {
            type: [{ name: { type: String, required: true }, price: { type: Number, required: true } }],
            default: [],
          },
          instructions: { type: String, maxlength: 300 },
        },
      ],
      default: [],
    },
    couponCode: { type: String },
  },
  { timestamps: true },
);

export const CartModel = model<CartDocument>('Cart', cartSchema);
