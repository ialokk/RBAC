import { HttpError } from '../common/http-error';
import { AddressModel, type AddressDocument } from './address.model';

type GeoInput = { lat: number; lng: number } | undefined;

function toGeoField(geo: GeoInput) {
  return geo ? { type: 'Point' as const, coordinates: [geo.lng, geo.lat] as [number, number] } : undefined;
}

export const addressesService = {
  async list(userId: string) {
    return AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  },

  async create(userId: string, input: Omit<AddressDocument, 'userId' | 'geo'> & { geo?: GeoInput }) {
    if (input.isDefault) {
      await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }
    return AddressModel.create({ ...input, userId, geo: toGeoField(input.geo) });
  },

  async update(userId: string, addressId: string, input: Partial<Omit<AddressDocument, 'userId' | 'geo'>> & { geo?: GeoInput }) {
    const address = await AddressModel.findOne({ _id: addressId, userId });
    if (!address) {
      throw new HttpError(404, 'Address not found');
    }
    if (input.isDefault) {
      await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }
    Object.assign(address, input, { geo: input.geo ? toGeoField(input.geo) : address.geo });
    await address.save();
    return address;
  },

  async remove(userId: string, addressId: string) {
    const result = await AddressModel.deleteOne({ _id: addressId, userId });
    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Address not found');
    }
  },
};
