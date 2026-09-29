import { z } from 'zod';

export const applyDeliveryPartnerSchema = {
  body: z
    .object({
      personalDetails: z
        .object({
          name: z.string().min(1).max(150),
          mobile: z.string().min(3).max(20),
          email: z.string().email().optional(),
          address: z.string().min(1).max(300),
        })
        .strict(),
      vehicleDetails: z
        .object({
          type: z.string().min(1).max(50),
          registrationNumber: z.string().min(1).max(30),
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

export const reviewDeliveryApplicationSchema = {
  body: z.object({ reason: z.string().min(1).max(500) }).strict(),
};

export const setAvailabilitySchema = {
  body: z.object({ availability: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']) }).strict(),
};

export const locationHeartbeatSchema = {
  body: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .strict(),
};

export const verifyDeliveryOtpSchema = {
  body: z.object({ code: z.string().length(4) }).strict(),
};

export const listApplicationsQuerySchema = {
  query: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
