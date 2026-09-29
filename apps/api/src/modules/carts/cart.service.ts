import { HttpError } from '../common/http-error';
import { computePricing } from '../common/pricing.util';
import { couponsService } from '../coupons/coupons.service';
import { MenuItemModel } from '../menu/menu-item.model';
import { CartModel, type CartDocument } from './cart.model';

export interface AddCartItemInput {
  restaurantId: string;
  menuItemId: string;
  qty: number;
  selectedVariationName?: string;
  selectedAddonNames: string[];
  instructions?: string;
}

async function getOrCreateCart(userId: string) {
  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    cart = await CartModel.create({ userId, items: [] });
  }
  return cart;
}

function itemsTotalOf(cart: CartDocument): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export const cartService = {
  async getCart(userId: string) {
    return getOrCreateCart(userId);
  },

  async addItem(userId: string, input: AddCartItemInput) {
    const cart = await getOrCreateCart(userId);

    // Single-restaurant cart: switching restaurants clears prior items (per docs/ERD.md §2.11).
    if (cart.restaurantId && cart.restaurantId.toString() !== input.restaurantId) {
      cart.items.splice(0, cart.items.length);
      cart.couponCode = undefined;
    }
    cart.restaurantId = input.restaurantId as unknown as CartDocument['restaurantId'];

    const menuItem = await MenuItemModel.findOne({ _id: input.menuItemId, restaurantId: input.restaurantId });
    if (!menuItem || !menuItem.isAvailable) {
      throw new HttpError(400, 'Menu item is not available');
    }

    const variation = input.selectedVariationName
      ? menuItem.variations.find((v) => v.name === input.selectedVariationName)
      : undefined;
    if (input.selectedVariationName && !variation) {
      throw new HttpError(400, 'Selected variation is not valid for this item');
    }

    const addonOptions = menuItem.addonGroupIds.length > 0 ? await import('../menu/food-addon.model') : null;
    let selectedAddons: { name: string; price: number }[] = [];
    if (input.selectedAddonNames.length > 0 && addonOptions) {
      const groups = await addonOptions.FoodAddonModel.find({ _id: { $in: menuItem.addonGroupIds } });
      const allOptions = groups.flatMap((g) => g.options);
      selectedAddons = input.selectedAddonNames.map((name) => {
        const option = allOptions.find((o) => o.name === name);
        if (!option) {
          throw new HttpError(400, `Add-on "${name}" is not valid for this item`);
        }
        return { name: option.name, price: option.price };
      });
    }

    const unitPrice = menuItem.price + (variation?.priceDelta ?? 0) + selectedAddons.reduce((s, a) => s + a.price, 0);

    cart.items.push({
      menuItemId: input.menuItemId as unknown as CartDocument['items'][number]['menuItemId'],
      name: menuItem.name,
      price: unitPrice,
      qty: input.qty,
      selectedVariation: variation ? { name: variation.name, priceDelta: variation.priceDelta } : undefined,
      selectedAddons,
      instructions: input.instructions,
    });

    await cart.save();
    return cart;
  },

  async updateItem(userId: string, itemRef: string, qty: number) {
    const cart = await getOrCreateCart(userId);
    const item = cart.items.id(itemRef);
    if (!item) {
      throw new HttpError(404, 'Cart item not found');
    }
    item.qty = qty;
    await cart.save();
    return cart;
  },

  async removeItem(userId: string, itemRef: string) {
    const cart = await getOrCreateCart(userId);
    if (!cart.items.id(itemRef)) {
      throw new HttpError(404, 'Cart item not found');
    }
    cart.items.pull(itemRef);
    if (cart.items.length === 0) {
      cart.restaurantId = undefined;
      cart.couponCode = undefined;
    }
    await cart.save();
    return cart;
  },

  async applyCoupon(userId: string, code: string) {
    const cart = await getOrCreateCart(userId);
    const itemsTotal = itemsTotalOf(cart);
    await couponsService.validateAndCompute(code, userId, cart.restaurantId?.toString(), itemsTotal);
    cart.couponCode = code.toUpperCase();
    await cart.save();
    return cart;
  },

  async removeCoupon(userId: string) {
    const cart = await getOrCreateCart(userId);
    cart.couponCode = undefined;
    await cart.save();
    return cart;
  },

  async checkoutPreview(userId: string) {
    const cart = await getOrCreateCart(userId);
    const itemsTotal = itemsTotalOf(cart);
    let discount = 0;
    if (cart.couponCode) {
      const evaluation = await couponsService.validateAndCompute(cart.couponCode, userId, cart.restaurantId?.toString(), itemsTotal);
      discount = evaluation.discount;
    }
    return computePricing(itemsTotal, discount);
  },
};
