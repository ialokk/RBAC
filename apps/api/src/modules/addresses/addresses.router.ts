import { Router } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { addressesService } from './addresses.service';
import { createAddressSchema, updateAddressSchema } from './addresses.validation';

export const addressesRouter = Router();

addressesRouter.use(authenticate, requirePermission('address:manage-own'));

/**
 * @openapi
 * /addresses:
 *   get:
 *     summary: List the current customer's saved addresses
 */
addressesRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json({ items: await addressesService.list(req.user.id) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /addresses:
 *   post:
 *     summary: Add a saved address
 */
addressesRouter.post('/', validate(createAddressSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const address = await addressesService.create(req.user.id, req.body);
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /addresses/{id}:
 *   patch:
 *     summary: Update a saved address
 */
addressesRouter.patch('/:id', validate(updateAddressSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const address = await addressesService.update(req.user.id, req.params.id, req.body);
    res.json(address);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /addresses/{id}:
 *   delete:
 *     summary: Remove a saved address
 */
addressesRouter.delete('/:id', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    await addressesService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
