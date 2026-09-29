import { AuditLogModel } from './audit-log.model';

export interface RecordAuditLogInput {
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// Append-only audit trail per docs/ROLE-PERMISSIONS.md §4 — every Admin ownership bypass (and
// notable system-driven exception) is recorded here. No update/delete endpoints are exposed.
export const auditLogService = {
  async record(input: RecordAuditLogInput): Promise<void> {
    await AuditLogModel.create(input);
  },
};
