import { z } from 'zod';

export const createCategorySchema = {
  body: z.object({ name: z.string().min(1).max(100), sortOrder: z.coerce.number().int().default(0) }).strict(),
};

export const updateCategorySchema = {
  body: z
    .object({ name: z.string().min(1).max(100).optional(), sortOrder: z.coerce.number().int().optional() })
    .strict(),
};

const variationSchema = z.object({ name: z.string().min(1).max(50), priceDelta: z.coerce.number().int() }).strict();

export const createItemSchema = {
  body: z
    .object({
      categoryId: z.string().min(1),
      name: z.string().min(1).max(150),
      description: z.string().max(1000).optional(),
      price: z.coerce.number().int().min(0),
      images: z.array(z.string().url()).max(6).default([]),
      isVeg: z.boolean().default(true),
      isAvailable: z.boolean().default(true),
      variations: z.array(variationSchema).max(10).default([]),
      addonGroupIds: z.array(z.string().min(1)).max(10).default([]),
      prepTimeMinutes: z.coerce.number().int().min(1).max(180).default(15),
    })
    .strict(),
};

export const updateItemSchema = {
  body: z
    .object({
      categoryId: z.string().min(1).optional(),
      name: z.string().min(1).max(150).optional(),
      description: z.string().max(1000).optional(),
      price: z.coerce.number().int().min(0).optional(),
      images: z.array(z.string().url()).max(6).optional(),
      isVeg: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      variations: z.array(variationSchema).max(10).optional(),
      addonGroupIds: z.array(z.string().min(1)).max(10).optional(),
      prepTimeMinutes: z.coerce.number().int().min(1).max(180).optional(),
    })
    .strict(),
};

const addonOptionSchema = z.object({ name: z.string().min(1).max(60), price: z.coerce.number().int().min(0) }).strict();

export const createAddonSchema = {
  body: z
    .object({
      groupName: z.string().min(1).max(100),
      options: z.array(addonOptionSchema).min(1).max(20),
      maxSelectable: z.coerce.number().int().min(1).max(20).default(1),
    })
    .strict(),
};

export const updateAddonSchema = {
  body: z
    .object({
      groupName: z.string().min(1).max(100).optional(),
      options: z.array(addonOptionSchema).min(1).max(20).optional(),
      maxSelectable: z.coerce.number().int().min(1).max(20).optional(),
    })
    .strict(),
};
