import { UserRole } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { RestaurantModel } from '../restaurants/restaurant.model';
import { UserModel } from '../users/user.model';
import { RestaurantApplicationModel, type RestaurantApplicationDocument } from './restaurant-application.model';

type GeoInput = { lat: number; lng: number } | undefined;

function toGeoField(geo: GeoInput) {
  return geo ? { type: 'Point' as const, coordinates: [geo.lng, geo.lat] as [number, number] } : undefined;
}

export interface CreateApplicationInput {
  ownerDetails: RestaurantApplicationDocument['ownerDetails'];
  restaurantDetails: RestaurantApplicationDocument['restaurantDetails'];
  address: Omit<RestaurantApplicationDocument['address'], 'geo'> & { geo?: GeoInput };
  documents: RestaurantApplicationDocument['documents'];
  bankDetails: RestaurantApplicationDocument['bankDetails'];
}

export const restaurantApplicationsService = {
  async create(userId: string, input: CreateApplicationInput) {
    const existing = await RestaurantApplicationModel.findOne({ applicantUserId: userId, status: { $in: ['PENDING', 'APPROVED'] } });
    if (existing) {
      throw new HttpError(409, 'You already have a pending or approved restaurant application');
    }

    return RestaurantApplicationModel.create({
      applicantUserId: userId,
      ownerDetails: input.ownerDetails,
      restaurantDetails: input.restaurantDetails,
      address: { ...input.address, geo: toGeoField(input.address.geo) },
      documents: input.documents,
      bankDetails: input.bankDetails,
      status: 'PENDING',
    });
  },

  async getOwn(userId: string) {
    const application = await RestaurantApplicationModel.findOne({ applicantUserId: userId }).sort({ createdAt: -1 });
    if (!application) {
      throw new HttpError(404, 'No restaurant application found');
    }
    return application;
  },

  async list(status: 'PENDING' | 'APPROVED' | 'REJECTED' | undefined, page: number, limit: number) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      RestaurantApplicationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      RestaurantApplicationModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id: string) {
    const application = await RestaurantApplicationModel.findById(id);
    if (!application) {
      throw new HttpError(404, 'Application not found');
    }
    return application;
  },

  async approve(adminUserId: string, applicationId: string) {
    const application = await this.getById(applicationId);
    if (application.status !== 'PENDING') {
      throw new HttpError(409, `Application is already ${application.status}`);
    }

    const restaurant = await RestaurantModel.create({
      ownerUserId: application.applicantUserId,
      applicationId: application._id,
      name: application.restaurantDetails.name,
      description: application.restaurantDetails.description,
      cuisines: application.restaurantDetails.cuisines,
      address: application.address,
      status: 'APPROVED',
      isOpen: true,
    });

    application.status = 'APPROVED';
    application.reviewedBy = adminUserId as unknown as RestaurantApplicationDocument['reviewedBy'];
    await application.save();

    await UserModel.updateOne(
      { _id: application.applicantUserId },
      { $set: { role: UserRole.RESTAURANT, restaurantId: restaurant._id }, $inc: { permVersion: 1 } },
    );

    return restaurant;
  },

  async reject(adminUserId: string, applicationId: string, reason: string) {
    const application = await this.getById(applicationId);
    if (application.status !== 'PENDING') {
      throw new HttpError(409, `Application is already ${application.status}`);
    }
    application.status = 'REJECTED';
    application.reviewedBy = adminUserId as unknown as RestaurantApplicationDocument['reviewedBy'];
    application.reviewNotes = reason;
    await application.save();
    return application;
  },
};
