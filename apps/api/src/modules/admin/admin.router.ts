import { Router } from 'express';
import { UserRole } from '@rbac/shared-types';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { platformConfigService } from '../common/platform-config.service';
import { adminService } from './admin.service';
import {
  createBannerSchema,
  createOfferSchema,
  dateRangeQuerySchema,
  listAuditLogsQuerySchema,
  paginationQuerySchema,
  updateBannerSchema,
  updateConfigSchema,
  updateOfferSchema,
} from './admin.validation';
import { HttpError } from '../common/http-error';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole(UserRole.ADMIN));

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     summary: Orders/revenue/customers/restaurants/partners/pending-approvals/active-deliveries summary
 */
adminRouter.get('/dashboard', requirePermission('reports:read'), async (_req, res, next) => {
  try {
    res.json(await adminService.dashboard());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /admin/reports/{report}:
 *   get:
 *     summary: Report exports — orders, sales, restaurants, delivery-partners, customers
 */
adminRouter.get('/reports/orders', requirePermission('reports:read'), validate(dateRangeQuerySchema), async (req, res, next) => {
  try {
    const { from, to } = req.query as unknown as { from?: Date; to?: Date };
    res.json(await adminService.reportOrders(from, to));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/sales', requirePermission('reports:read'), validate(dateRangeQuerySchema), async (req, res, next) => {
  try {
    const { from, to } = req.query as unknown as { from?: Date; to?: Date };
    res.json(await adminService.reportSales(from, to));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/restaurants', requirePermission('reports:read'), async (_req, res, next) => {
  try {
    res.json(await adminService.reportRestaurants());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/delivery-partners', requirePermission('reports:read'), async (_req, res, next) => {
  try {
    res.json(await adminService.reportDeliveryPartners());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/reports/customers', requirePermission('reports:read'), async (_req, res, next) => {
  try {
    res.json(await adminService.reportCustomers());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /admin/config:
 *   get:
 *     summary: Platform configuration (delivery charges, taxes, commission, min order, zones, cancellation rules)
 *   patch:
 *     summary: Update platform configuration
 */
adminRouter.get('/config', requirePermission('config:manage-platform'), async (_req, res, next) => {
  try {
    res.json(await platformConfigService.getConfig());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/config',
  requirePermission('config:manage-platform'),
  validate(updateConfigSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await platformConfigService.updateConfig(req.user.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: Audit trail search
 */
adminRouter.get(
  '/audit-logs',
  requirePermission('audit-log:read'),
  validate(listAuditLogsQuerySchema),
  async (req, res, next) => {
    try {
      const { page, limit, action, targetType } = req.query as unknown as {
        page: number;
        limit: number;
        action?: string;
        targetType?: string;
      };
      res.json(await adminService.listAuditLogs(page, limit, action, targetType));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /admin/banners:
 *   get:
 *     summary: List banners
 *   post:
 *     summary: Create a banner
 */
adminRouter.get('/banners', requirePermission('marketing:manage'), validate(paginationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    res.json(await adminService.listBanners(page, limit));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/banners', requirePermission('marketing:manage'), validate(createBannerSchema), async (req, res, next) => {
  try {
    res.status(201).json(await adminService.createBanner(req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/banners/:id',
  requirePermission('marketing:manage'),
  validate(updateBannerSchema),
  async (req, res, next) => {
    try {
      res.json(await adminService.updateBanner(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.delete('/banners/:id', requirePermission('marketing:manage'), async (req, res, next) => {
  try {
    await adminService.deleteBanner(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /admin/offers:
 *   get:
 *     summary: List offers
 *   post:
 *     summary: Create an offer
 */
adminRouter.get('/offers', requirePermission('marketing:manage'), validate(paginationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    res.json(await adminService.listOffers(page, limit));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/offers', requirePermission('marketing:manage'), validate(createOfferSchema), async (req, res, next) => {
  try {
    res.status(201).json(await adminService.createOffer(req.body));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/offers/:id',
  requirePermission('marketing:manage'),
  validate(updateOfferSchema),
  async (req, res, next) => {
    try {
      res.json(await adminService.updateOffer(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.delete('/offers/:id', requirePermission('marketing:manage'), async (req, res, next) => {
  try {
    await adminService.deleteOffer(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
