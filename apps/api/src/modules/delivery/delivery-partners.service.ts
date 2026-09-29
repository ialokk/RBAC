import { UserRole } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { UserModel } from '../users/user.model';
import { emitPartnerAvailabilityChanged } from '../../sockets/realtime-events.service';
import { DeliveryPartnerModel, type DeliveryPartnerDocument } from './delivery-partner.model';

export interface ApplyDeliveryPartnerInput {
  personalDetails: DeliveryPartnerDocument['personalDetails'];
  vehicleDetails: DeliveryPartnerDocument['vehicleDetails'];
  documents: DeliveryPartnerDocument['documents'];
  bankDetails: DeliveryPartnerDocument['bankDetails'];
}

export const deliveryPartnersService = {
  async apply(userId: string, input: ApplyDeliveryPartnerInput) {
    const existing = await DeliveryPartnerModel.findOne({ userId, status: { $in: ['PENDING', 'APPROVED'] } });
    if (existing) {
      throw new HttpError(409, 'You already have a pending or approved delivery partner profile');
    }
    return DeliveryPartnerModel.create({
      userId,
      ...input,
      status: 'PENDING',
      availability: 'OFFLINE',
    });
  },

  async getOwn(userId: string) {
    const partner = await DeliveryPartnerModel.findOne({ userId }).sort({ createdAt: -1 });
    if (!partner) {
      throw new HttpError(404, 'No delivery partner application found');
    }
    return partner;
  },

  async list(status: string | undefined, page: number, limit: number) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      DeliveryPartnerModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DeliveryPartnerModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id: string) {
    const partner = await DeliveryPartnerModel.findById(id);
    if (!partner) {
      throw new HttpError(404, 'Delivery partner not found');
    }
    return partner;
  },

  async approve(adminUserId: string, applicationId: string) {
    const partner = await this.getById(applicationId);
    if (partner.status !== 'PENDING') {
      throw new HttpError(409, `Application is already ${partner.status}`);
    }
    partner.status = 'APPROVED';
    partner.reviewedBy = adminUserId as unknown as DeliveryPartnerDocument['reviewedBy'];
    await partner.save();

    await UserModel.updateOne(
      { _id: partner.userId },
      { $set: { role: UserRole.DELIVERY_PARTNER, deliveryPartnerId: partner._id }, $inc: { permVersion: 1 } },
    );

    return partner;
  },

  async reject(adminUserId: string, applicationId: string, reason: string) {
    const partner = await this.getById(applicationId);
    if (partner.status !== 'PENDING') {
      throw new HttpError(409, `Application is already ${partner.status}`);
    }
    partner.status = 'REJECTED';
    partner.reviewedBy = adminUserId as unknown as DeliveryPartnerDocument['reviewedBy'];
    partner.reviewNotes = reason;
    await partner.save();
    return partner;
  },

  async setSuspended(partnerId: string, suspended: boolean) {
    const partner = await this.getById(partnerId);
    partner.status = suspended ? 'SUSPENDED' : 'APPROVED';
    if (suspended) {
      partner.availability = 'OFFLINE';
    }
    await partner.save();
    return partner;
  },

  // Ownership resolution per docs/ROLE-PERMISSIONS.md §4 — a DELIVERY_PARTNER user only acts on
  // their own (APPROVED) partner profile.
  async getOwnApprovedOrThrow(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user?.deliveryPartnerId) {
      throw new HttpError(403, 'No delivery partner profile is associated with this account yet');
    }
    const partner = await DeliveryPartnerModel.findById(user.deliveryPartnerId);
    if (!partner || partner.status !== 'APPROVED') {
      throw new HttpError(403, 'Delivery partner account is not active');
    }
    return partner;
  },

  async setAvailability(userId: string, availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE') {
    const partner = await this.getOwnApprovedOrThrow(userId);
    partner.availability = availability;
    await partner.save();
    emitPartnerAvailabilityChanged(partner.id, availability);
    return partner;
  },

  async recordLocation(partnerId: string, lat: number, lng: number) {
    await DeliveryPartnerModel.updateOne(
      { _id: partnerId },
      { $set: { currentLocation: { type: 'Point', coordinates: [lng, lat] } } },
    );
  },
};
