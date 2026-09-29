import { z } from 'zod';

export const createCouponSchema = {
  body: z
    .object({
      code: z.string().min(2).max(30),
      discountType: z.enum(['PERCENT', 'FLAT']),
      value: z.coerce.number().positive(),
      maxDiscount: z.coerce.number().nonnegative().optional(),
      minOrderValue: z.coerce.number().nonnegative().default(0),
      validFrom: z.coerce.date(),
      validTo: z.coerce.date(),
      usageLimitPerUser: z.coerce.number().int().nonnegative().default(1),
      totalUsageLimit: z.coerce.number().int().nonnegative().default(0),
      applicableRestaurantIds: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
    })
    .strict(),
};

export const updateCouponSchema = {
  body: z
    .object({
      discountType: z.enum(['PERCENT', 'FLAT']).optional(),
      value: z.coerce.number().positive().optional(),
      maxDiscount: z.coerce.number().nonnegative().optional(),
      minOrderValue: z.coerce.number().nonnegative().optional(),
      validFrom: z.coerce.date().optional(),
      validTo: z.coerce.date().optional(),
      usageLimitPerUser: z.coerce.number().int().nonnegative().optional(),
      totalUsageLimit: z.coerce.number().int().nonnegative().optional(),
      applicableRestaurantIds: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
};

export const listCouponsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isActive: z.coerce.boolean().optional(),
  }),
};
