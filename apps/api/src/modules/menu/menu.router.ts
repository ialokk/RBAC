import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { HttpError } from '../common/http-error';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { UserRole } from '@rbac/shared-types';
import { restaurantsService } from '../restaurants/restaurants.service';
import { menuService } from './menu.service';
import {
  createAddonSchema,
  createCategorySchema,
  createItemSchema,
  updateAddonSchema,
  updateCategorySchema,
  updateItemSchema,
} from './menu.validation';

// Mounted at /restaurants/:restaurantId/menu — GET routes are public (Phase 3 customer browsing);
// write routes are RESTAURANT-only and restricted to the caller's own restaurant (Phase 4).
export const menuRouter = Router({ mergeParams: true });

// Verifies the authenticated RESTAURANT user's own (APPROVED) restaurant matches the URL's
// :restaurantId — never trusts the URL param alone. See docs/ROLE-PERMISSIONS.md §4.
async function requireOwnRestaurant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const { restaurantId } = req.params as { restaurantId: string };
    const restaurant = await restaurantsService.getOwnRestaurantOrThrow(req.user.id);
    if (restaurant.id !== restaurantId) {
      throw new HttpError(403, 'You do not own this restaurant');
    }
    next();
  } catch (err) {
    next(err);
  }
}

const restaurantOwnerGuard = [authenticate, requireRole(UserRole.RESTAURANT), requirePermission('menu:manage-own'), requireOwnRestaurant];

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/categories:
 *   get:
 *     summary: List menu categories for a restaurant (public)
 */
menuRouter.get('/categories', async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.json({ items: await menuService.listCategories(restaurantId) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/categories:
 *   post:
 *     summary: Create a menu category (RESTAURANT, own restaurant only)
 */
menuRouter.post('/categories', ...restaurantOwnerGuard, validate(createCategorySchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.status(201).json(await menuService.createCategory(restaurantId, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/categories/{id}:
 *   patch:
 *     summary: Update a menu category (RESTAURANT, own restaurant only)
 */
menuRouter.patch('/categories/:id', ...restaurantOwnerGuard, validate(updateCategorySchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.json(await menuService.updateCategory(restaurantId, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/categories/{id}:
 *   delete:
 *     summary: Delete a menu category (RESTAURANT, own restaurant only)
 */
menuRouter.delete('/categories/:id', ...restaurantOwnerGuard, async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    await menuService.deleteCategory(restaurantId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/items:
 *   get:
 *     summary: List menu items for a restaurant, optionally filtered by categoryId (public)
 */
menuRouter.get('/items', async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    res.json({ items: await menuService.listItems(restaurantId, categoryId) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/items:
 *   post:
 *     summary: Create a food item — name, description, price, images, veg/non-veg, availability,
 *       variations, add-on groups, prep time (RESTAURANT, own restaurant only)
 */
menuRouter.post('/items', ...restaurantOwnerGuard, validate(createItemSchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.status(201).json(await menuService.createItem(restaurantId, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/items/{itemId}:
 *   get:
 *     summary: Food item details (public)
 */
menuRouter.get('/items/:itemId', async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params as { restaurantId: string; itemId: string };
    res.json(await menuService.getItemOrThrow(restaurantId, itemId));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/items/{itemId}:
 *   patch:
 *     summary: Update a food item, e.g. price/availability/images (RESTAURANT, own restaurant only)
 */
menuRouter.patch('/items/:itemId', ...restaurantOwnerGuard, validate(updateItemSchema), async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params as { restaurantId: string; itemId: string };
    res.json(await menuService.updateItem(restaurantId, itemId, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/items/{itemId}:
 *   delete:
 *     summary: Delete a food item (RESTAURANT, own restaurant only)
 */
menuRouter.delete('/items/:itemId', ...restaurantOwnerGuard, async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params as { restaurantId: string; itemId: string };
    await menuService.deleteItem(restaurantId, itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/addons:
 *   get:
 *     summary: List add-on groups for a restaurant (public)
 */
menuRouter.get('/addons', async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.json({ items: await menuService.listAddons(restaurantId) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/addons:
 *   post:
 *     summary: Create an add-on group (RESTAURANT, own restaurant only)
 */
menuRouter.post('/addons', ...restaurantOwnerGuard, validate(createAddonSchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.status(201).json(await menuService.createAddon(restaurantId, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/addons/{id}:
 *   patch:
 *     summary: Update an add-on group (RESTAURANT, own restaurant only)
 */
menuRouter.patch('/addons/:id', ...restaurantOwnerGuard, validate(updateAddonSchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    res.json(await menuService.updateAddon(restaurantId, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{restaurantId}/menu/addons/{id}:
 *   delete:
 *     summary: Delete an add-on group (RESTAURANT, own restaurant only)
 */
menuRouter.delete('/addons/:id', ...restaurantOwnerGuard, async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    await menuService.deleteAddon(restaurantId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
