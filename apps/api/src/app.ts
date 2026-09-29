import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { parseCorsOrigins } from './config/cors';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './modules/common/error-handler';
import { generalApiLimiter } from './modules/common/rate-limit';
import { addressesRouter } from './modules/addresses/addresses.router';
import { adminRouter } from './modules/admin/admin.router';
import { authRouter } from './modules/auth/auth.router';
import { cartRouter } from './modules/carts/cart.router';
import { couponsRouter } from './modules/coupons/coupons.router';
import { deliveryRouter } from './modules/delivery/delivery.router';
import { healthRouter } from './modules/health/health.router';
import { menuRouter } from './modules/menu/menu.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { ordersRouter } from './modules/orders/orders.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { restaurantApplicationsRouter } from './modules/restaurant-applications/restaurant-applications.router';
import { restaurantsRouter } from './modules/restaurants/restaurants.router';
import { restaurantReviewsRouter, reviewsRouter } from './modules/reviews/reviews.router';
import { searchRouter } from './modules/search/search.router';
import { usersRouter } from './modules/users/users.router';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Exact bytes of the request body, captured before JSON parsing — required for HMAC webhook
      // signature verification (docs/SECURITY.md §5), where re-serializing req.body could differ
      // byte-for-byte from what the provider actually signed.
      rawBody?: Buffer;
    }
  }
}

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: parseCorsOrigins(env.CORS_ORIGIN), credentials: true }));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as import('express').Request).rawBody = Buffer.from(buf);
      },
    }),
  );
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }
  app.use(generalApiLimiter);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/addresses', addressesRouter);
  app.use('/api/v1/restaurant-applications', restaurantApplicationsRouter);
  app.use('/api/v1/restaurants/:restaurantId/menu', menuRouter);
  app.use('/api/v1/restaurants/:restaurantId/reviews', restaurantReviewsRouter);
  app.use('/api/v1/restaurants', restaurantsRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/coupons', couponsRouter);
  app.use('/api/v1/delivery', deliveryRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
