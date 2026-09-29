import { Schema, model, type HydratedDocument } from 'mongoose';
import { UserRole } from '@rbac/shared-types';

export interface UserDocument {
  role: UserRole;
  name?: string;
  mobile?: string;
  email?: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  restaurantId?: Schema.Types.ObjectId;
  deliveryPartnerId?: Schema.Types.ObjectId;
  lastLoginAt?: Date;
  permVersion: number;
}

export type UserHydratedDocument = HydratedDocument<UserDocument>;

const userSchema = new Schema<UserDocument>(
  {
    // Never settable by client input — only changed server-side when an Admin approves a
    // restaurant/delivery-partner application (see modules/restaurant-applications).
    role: { type: String, enum: Object.values(UserRole), required: true },
    name: { type: String },
    mobile: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, unique: true, sparse: true, index: true, lowercase: true, trim: true },
    mobileVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    lastLoginAt: { type: Date },
    // Bumped whenever role/permissions change server-side to invalidate outstanding access tokens.
    permVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const UserModel = model<UserDocument>('User', userSchema);
