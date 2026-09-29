import { z } from 'zod';

export const updateOwnRestaurantSchema = {
  body: z
    .object({
      name: z.string().min(1).max(150).optional(),
      description: z.string().max(2000).optional(),
      cuisines: z.array(z.string().max(50)).optional(),
      avgPrepTimeMinutes: z.coerce.number().int().min(1).max(180).optional(),
      address: z
        .object({
          line1: z.string().min(1).max(200),
          city: z.string().min(1).max(100),
          state: z.string().min(1).max(100),
          pincode: z.string().min(1).max(12),
          geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
};

export const setOpenStatusSchema = {
  body: z.object({ isOpen: z.boolean() }).strict(),
};
