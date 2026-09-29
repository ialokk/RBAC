import { z } from 'zod';

export const listUsersQuerySchema = {
  query: z.object({
    role: z.string().max(40).optional(),
    status: z.string().max(20).optional(),
    q: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const setUserStatusSchema = {
  body: z
    .object({
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    })
    .strict(),
};

// Own-profile fields only — `role`, `status`, `permVersion`, `restaurantId` and
// `deliveryPartnerId` are deliberately absent and `.strict()` rejects them outright, so a client
// can never self-promote (docs/SECURITY.md §4).
export const updateOwnProfileSchema = {
  body: z
    .object({
      name: z.string().min(1).max(120).optional(),
      email: z.string().email().max(200).optional(),
    })
    .strict(),
};
