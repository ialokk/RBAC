import { z } from 'zod';

export const createOrderSchema = {
  body: z
    .object({
      addressId: z.string().min(1),
      paymentMethod: z.enum(['UPI', 'CARD', 'NETBANKING', 'COD']),
    })
    .strict(),
};

export const cancelOrderSchema = {
  body: z
    .object({
      reason: z.string().min(1).max(300),
    })
    .strict(),
};

export const listOrdersQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().max(40).optional(),
  }),
};

export const rejectOrderSchema = {
  body: z.object({ reason: z.string().min(1).max(300) }).strict(),
};

export const setPrepTimeSchema = {
  body: z.object({ prepTimeMinutes: z.coerce.number().int().min(1).max(180) }).strict(),
};
