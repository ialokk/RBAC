import { z } from 'zod';

export const dateRangeQuerySchema = {
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
};

export const listAuditLogsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().max(80).optional(),
    targetType: z.string().max(40).optional(),
  }),
};

export const paginationQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const updateConfigSchema = {
  body: z
    .object({
      deliveryChargeMinor: z.coerce.number().int().nonnegative().optional(),
      taxPercent: z.coerce.number().nonnegative().optional(),
      minOrderValueMinor: z.coerce.number().int().nonnegative().optional(),
      deliveryPartnerEarningMinor: z.coerce.number().int().nonnegative().optional(),
      commissionPercent: z.coerce.number().nonnegative().optional(),
      cancellationWindowMinutes: z.coerce.number().int().nonnegative().optional(),
      serviceZones: z
        .array(
          z.object({
            name: z.string().min(1),
            centerLat: z.number(),
            centerLng: z.number(),
            radiusKm: z.number().positive(),
          }),
        )
        .optional(),
    })
    .strict(),
};

export const createBannerSchema = {
  body: z
    .object({
      title: z.string().min(1).max(200),
      imageUrl: z.string().min(1),
      linkUrl: z.string().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.coerce.number().int().default(0),
    })
    .strict(),
};

export const updateBannerSchema = {
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      imageUrl: z.string().min(1).optional(),
      linkUrl: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().optional(),
    })
    .strict(),
};

export const createOfferSchema = {
  body: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      imageUrl: z.string().optional(),
      code: z.string().max(30).optional(),
      isActive: z.boolean().default(true),
      validFrom: z.coerce.date(),
      validTo: z.coerce.date(),
    })
    .strict(),
};

export const updateOfferSchema = {
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      imageUrl: z.string().optional(),
      code: z.string().max(30).optional(),
      isActive: z.boolean().optional(),
      validFrom: z.coerce.date().optional(),
      validTo: z.coerce.date().optional(),
    })
    .strict(),
};
