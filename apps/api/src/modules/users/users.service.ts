import { HttpError } from '../common/http-error';
import { auditLogService } from '../common/audit-log.service';
import { UserModel } from './user.model';

export interface ListUsersQuery {
  role?: string;
  status?: string;
  q?: string;
  page: number;
  limit: number;
}

export const usersService = {
  // ADMIN — customer/user management (docs/API-SPEC.md §3), paginated + filterable per Phase 9.
  async list(query: ListUsersQuery) {
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: 'i' } },
        { mobile: { $regex: query.q, $options: 'i' } },
        { email: { $regex: query.q, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      UserModel.countDocuments(filter),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  },

  async getById(id: string) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    return user;
  },

  async updateOwnProfile(userId: string, input: { name?: string; email?: string }) {
    const user = await this.getById(userId);
    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) {
      user.email = input.email;
      user.emailVerified = false;
    }
    await user.save();
    return user;
  },

  async setStatus(adminUserId: string, id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    const user = await this.getById(id);
    user.status = status;
    // Invalidate outstanding access tokens for the affected account immediately.
    user.permVersion += 1;
    await user.save();
    await auditLogService.record({
      actorUserId: adminUserId,
      action: 'USER_STATUS_CHANGE',
      targetType: 'user',
      targetId: id,
      metadata: { status },
    });
    return user;
  },
};
