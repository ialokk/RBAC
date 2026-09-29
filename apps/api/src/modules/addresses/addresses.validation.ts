import { z } from 'zod';

const geoSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .optional();

export const createAddressSchema = {
  body: z
    .object({
      label: z.string().min(1).max(40),
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      pincode: z.string().min(1).max(12),
      geo: geoSchema,
      isDefault: z.boolean().optional(),
    })
    .strict(),
};

export const updateAddressSchema = {
  body: z
    .object({
      label: z.string().min(1).max(40).optional(),
      line1: z.string().min(1).max(200).optional(),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(100).optional(),
      state: z.string().min(1).max(100).optional(),
      pincode: z.string().min(1).max(12).optional(),
      geo: geoSchema,
      isDefault: z.boolean().optional(),
    })
    .strict(),
};
