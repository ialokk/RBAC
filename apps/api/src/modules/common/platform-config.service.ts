import { auditLogService } from './audit-log.service';
import { PlatformConfigModel, type PlatformConfigDocument } from './platform-config.model';

export type PlatformConfigPatch = Partial<Omit<PlatformConfigDocument, 'serviceZones'>> & {
  serviceZones?: PlatformConfigDocument['serviceZones'];
};

export const platformConfigService = {
  // Single-document config, created with schema defaults on first read — every other service
  // (pricing, earnings) calls this instead of reading env.ts directly.
  async getConfig() {
    const existing = await PlatformConfigModel.findOne();
    if (existing) return existing;
    return PlatformConfigModel.create({});
  },

  async updateConfig(adminUserId: string, patch: PlatformConfigPatch) {
    const config = await this.getConfig();
    Object.assign(config, patch);
    await config.save();
    await auditLogService.record({
      actorUserId: adminUserId,
      action: 'PLATFORM_CONFIG_UPDATE',
      targetType: 'platform-config',
      targetId: config.id,
      metadata: patch,
    });
    return config;
  },
};
