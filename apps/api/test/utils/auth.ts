import { UserRole } from '@rbac/shared-types';
import { UserModel } from '../../src/modules/users/user.model';
import { signAccessToken } from '../../src/modules/auth/access-token.util';

export interface TestUserOptions {
  mobile?: string;
  email?: string;
  name?: string;
  restaurantId?: string;
  deliveryPartnerId?: string;
}

// Creates a real User document and a real, validly-signed access token for it — bypasses the OTP
// request/verify round-trip for tests that aren't specifically exercising auth, while still going
// through the actual JWT signing code (no hand-rolled fake tokens).
export async function createTestUser(role: UserRole, options: TestUserOptions = {}) {
  const user = await UserModel.create({
    role,
    status: 'ACTIVE',
    permVersion: 1,
    mobile: options.mobile ?? `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    email: options.email,
    name: options.name ?? `Test ${role}`,
    restaurantId: options.restaurantId,
    deliveryPartnerId: options.deliveryPartnerId,
  });

  const token = signAccessToken({ sub: user.id, role: user.role, permVersion: user.permVersion });
  return { user, token };
}
