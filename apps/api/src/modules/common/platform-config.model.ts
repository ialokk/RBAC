import { Schema, model } from 'mongoose';

// Singleton document (Phase 9 — Admin-configurable platform config, replacing the env.ts
// placeholders used by earlier phases). `platform-config.service.ts` upserts this on first read.
export interface ServiceZone {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface PlatformConfigDocument {
  deliveryChargeMinor: number;
  taxPercent: number;
  minOrderValueMinor: number;
  deliveryPartnerEarningMinor: number;
  commissionPercent: number;
  cancellationWindowMinutes: number;
  serviceZones: ServiceZone[];
}

const serviceZoneSchema = new Schema<ServiceZone>(
  {
    name: { type: String, required: true },
    centerLat: { type: Number, required: true },
    centerLng: { type: Number, required: true },
    radiusKm: { type: Number, required: true },
  },
  { _id: false },
);

const platformConfigSchema = new Schema<PlatformConfigDocument>(
  {
    deliveryChargeMinor: { type: Number, default: 4000 },
    taxPercent: { type: Number, default: 5 },
    minOrderValueMinor: { type: Number, default: 10000 },
    deliveryPartnerEarningMinor: { type: Number, default: 3000 },
    commissionPercent: { type: Number, default: 15 },
    cancellationWindowMinutes: { type: Number, default: 0 },
    serviceZones: { type: [serviceZoneSchema], default: [] },
  },
  { timestamps: true },
);

export const PlatformConfigModel = model<PlatformConfigDocument>('PlatformConfig', platformConfigSchema);
