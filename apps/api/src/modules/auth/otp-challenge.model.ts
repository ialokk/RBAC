import { Schema, model } from 'mongoose';

export interface OtpChallengeDocument {
  target: string;
  channel: 'SMS' | 'EMAIL';
  purpose: 'LOGIN' | 'VERIFY_MOBILE' | 'VERIFY_EMAIL';
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date;
}

const otpChallengeSchema = new Schema<OtpChallengeDocument>(
  {
    target: { type: String, required: true, index: true },
    channel: { type: String, enum: ['SMS', 'EMAIL'], required: true },
    purpose: { type: String, enum: ['LOGIN', 'VERIFY_MOBILE', 'VERIFY_EMAIL'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

// MongoDB TTL index — documents are auto-removed once expiresAt passes (no Redis/external cache).
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallengeModel = model<OtpChallengeDocument>('OtpChallenge', otpChallengeSchema);
