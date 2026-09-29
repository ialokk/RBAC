import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../common/validate.middleware';
import { RestaurantModel } from '../restaurants/restaurant.model';
import { MenuItemModel } from '../menu/menu-item.model';

export const searchRouter = Router();

const qSchema = { query: z.object({ q: z.string().min(1).max(200) }) };

/**
 * @openapi
 * /search/restaurants:
 *   get:
 *     summary: Text search over approved restaurants (public)
 */
searchRouter.get('/restaurants', validate(qSchema), async (req, res, next) => {
  try {
    const { q } = req.query as unknown as { q: string };
    const items = await RestaurantModel.find(
      { status: 'APPROVED', $text: { $search: q } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /search/food:
 *   get:
 *     summary: Text search over menu items across restaurants (public)
 */
searchRouter.get('/food', validate(qSchema), async (req, res, next) => {
  try {
    const { q } = req.query as unknown as { q: string };
    const items = await MenuItemModel.find(
      { isAvailable: true, $text: { $search: q } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(30);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /search/autocomplete:
 *   get:
 *     summary: Fast prefix suggestions across restaurant names (public)
 */
searchRouter.get('/autocomplete', validate(qSchema), async (req, res, next) => {
  try {
    const { q } = req.query as unknown as { q: string };
    const items = await RestaurantModel.find(
      { status: 'APPROVED', name: { $regex: `^${q}`, $options: 'i' } },
      { name: 1 },
    ).limit(10);
    res.json({ items: items.map((r) => ({ id: r.id, name: r.name })) });
  } catch (err) {
    next(err);
  }
});
