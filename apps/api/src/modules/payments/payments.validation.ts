import { z } from 'zod';

export const initiatePaymentSchema = {
  body: z
    .object({
      orderId: z.string().min(1),
      method: z.enum(['UPI', 'CARD', 'NETBANKING']),
    })
    .strict(),
};

export const verifyPaymentSchema = {
  body: z
    .object({
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    })
    .strict(),
};

export const refundPaymentSchema = {
  body: z
    .object({
      amount: z.coerce.number().int().positive().optional(),
      reason: z.string().min(1).max(300),
    })
    .strict(),
};

export const listPaymentsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().max(40).optional(),
    gateway: z.string().max(40).optional(),
  }),
};
