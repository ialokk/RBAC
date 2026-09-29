import { Schema, model } from 'mongoose';

export interface AuditLogDocument {
  actorUserId?: Schema.Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

export const AuditLogModel = model<AuditLogDocument>('AuditLog', auditLogSchema);
