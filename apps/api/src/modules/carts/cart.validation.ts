import { z } from 'zod';

export const addCartItemSchema = {
  body: z
    .object({
      restaurantId: z.string().min(1),
      menuItemId: z.string().min(1),
      qty: z.coerce.number().int().min(1).max(20).default(1),
      selectedVariationName: z.string().max(100).optional(),
      selectedAddonNames: z.array(z.string().max(100)).max(10).default([]),
      instructions: z.string().max(300).optional(),
    })
    .strict(),
};

export const updateCartItemSchema = {
  body: z
    .object({
      qty: z.coerce.number().int().min(1).max(20),
    })
    .strict(),
};

export const applyCouponSchema = {
  body: z.object({ code: z.string().min(1).max(40) }).strict(),
};
