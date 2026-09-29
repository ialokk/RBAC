import { z } from 'zod';

export const createRestaurantApplicationSchema = {
  body: z
    .object({
      ownerDetails: z
        .object({
          name: z.string().min(1).max(150),
          mobile: z.string().min(3).max(20),
          email: z.string().email().optional(),
          idProof: z.string().max(300).optional(),
        })
        .strict(),
      restaurantDetails: z
        .object({
          name: z.string().min(1).max(150),
          cuisines: z.array(z.string().max(50)).default([]),
          description: z.string().max(2000).optional(),
        })
        .strict(),
      address: z
        .object({
          line1: z.string().min(1).max(200),
          city: z.string().min(1).max(100),
          state: z.string().min(1).max(100),
          pincode: z.string().min(1).max(12),
          geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
        })
        .strict(),
      documents: z
        .array(z.object({ type: z.string().min(1).max(50), url: z.string().url() }).strict())
        .max(10)
        .default([]),
      bankDetails: z
        .object({
          accountNumber: z.string().min(4).max(34),
          ifsc: z.string().min(4).max(15),
          accountHolder: z.string().min(1).max(150),
        })
        .strict(),
    })
    .strict(),
};

export const reviewApplicationSchema = {
  body: z.object({ reason: z.string().min(1).max(500) }).strict(),
};

export const listApplicationsQuerySchema = {
  query: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
