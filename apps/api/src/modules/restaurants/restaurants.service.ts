import { HttpError } from '../common/http-error';
import { UserModel } from '../users/user.model';
import { RestaurantModel } from './restaurant.model';

export interface RestaurantListQuery {
  q?: string;
  cuisine?: string;
  page: number;
  limit: number;
}

type GeoInput = { lat: number; lng: number } | undefined;

function toGeoField(geo: GeoInput) {
  return geo ? { type: 'Point' as const, coordinates: [geo.lng, geo.lat] as [number, number] } : undefined;
}

export interface UpdateOwnRestaurantInput {
  name?: string;
  description?: string;
  cuisines?: string[];
  avgPrepTimeMinutes?: number;
  address?: { line1: string; city: string; state: string; pincode: string; geo?: GeoInput };
}

export const restaurantsService = {
  async list(query: RestaurantListQuery) {
    const filter: Record<string, unknown> = { status: 'APPROVED' };
    if (query.q) {
      filter.$text = { $search: query.q };
    }
    if (query.cuisine) {
      filter.cuisines = query.cuisine;
    }

    const [items, total] = await Promise.all([
      RestaurantModel.find(filter)
        .sort({ 'rating.avg': -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      RestaurantModel.countDocuments(filter),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  },

  async getById(id: string) {
    const restaurant = await RestaurantModel.findOne({ _id: id, status: 'APPROVED' });
    if (!restaurant) {
      throw new HttpError(404, 'Restaurant not found');
    }
    return restaurant;
  },

  // ADMIN — unlike the public list() above, this returns restaurants of ANY status (including
  // SUSPENDED), since an admin managing restaurants needs to find a suspended one to reactivate it.
  async listAdmin(query: { status?: string; page: number; limit: number }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      RestaurantModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      RestaurantModel.countDocuments(filter),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  },

  // Ownership resolution per docs/ROLE-PERMISSIONS.md §4: RESTAURANT users act only on the
  // restaurant referenced by their own user.restaurantId, and only while it is APPROVED.
  async getOwnRestaurantOrThrow(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user?.restaurantId) {
      throw new HttpError(403, 'No restaurant is associated with this account yet');
    }
    const restaurant = await RestaurantModel.findById(user.restaurantId);
    if (!restaurant || restaurant.status !== 'APPROVED') {
      throw new HttpError(403, 'Restaurant account is not active');
    }
    return restaurant;
  },

  async updateOwn(userId: string, input: UpdateOwnRestaurantInput) {
    const restaurant = await this.getOwnRestaurantOrThrow(userId);
    if (input.name !== undefined) restaurant.name = input.name;
    if (input.description !== undefined) restaurant.description = input.description;
    if (input.cuisines !== undefined) restaurant.cuisines = input.cuisines;
    if (input.avgPrepTimeMinutes !== undefined) restaurant.avgPrepTimeMinutes = input.avgPrepTimeMinutes;
    if (input.address !== undefined) {
      restaurant.address = { ...input.address, geo: toGeoField(input.address.geo) };
    }
    await restaurant.save();
    return restaurant;
  },

  async setOpenStatus(userId: string, isOpen: boolean) {
    const restaurant = await this.getOwnRestaurantOrThrow(userId);
    restaurant.isOpen = isOpen;
    await restaurant.save();
    return restaurant;
  },

  // ADMIN — activation/suspension exception handling (docs/API-SPEC.md §6).
  async setSuspended(id: string, suspended: boolean) {
    const restaurant = await RestaurantModel.findById(id);
    if (!restaurant) {
      throw new HttpError(404, 'Restaurant not found');
    }
    restaurant.status = suspended ? 'SUSPENDED' : 'APPROVED';
    await restaurant.save();
    return restaurant;
  },
};
