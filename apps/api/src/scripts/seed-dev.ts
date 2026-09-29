/**
 * Development-only seed script — creates realistic demo data so a fresh MongoDB can be exercised
 * end-to-end without manually walking every onboarding/approval flow by hand. Never run against a
 * real/production database (guarded below); OTP-only login means there are no passwords to leak,
 * but role/approval state is still meaningful data you don't want to fabricate in production.
 *
 * Usage:
 *   npm run seed:dev --workspace apps/api
 *
 * Idempotent-ish: looks up by mobile number first and skips creating a duplicate if already seeded.
 */
import { connectToDatabase, disconnectFromDatabase } from '../db/mongoose';
import { env } from '../config/env';
import { UserRole } from '@rbac/shared-types';
import { UserModel } from '../modules/users/user.model';
import { RestaurantModel } from '../modules/restaurants/restaurant.model';
import { MenuCategoryModel } from '../modules/menu/menu-category.model';
import { MenuItemModel } from '../modules/menu/menu-item.model';
import { DeliveryPartnerModel } from '../modules/delivery/delivery-partner.model';
import { AddressModel } from '../modules/addresses/address.model';
import { platformConfigService } from '../modules/common/platform-config.service';

async function upsertUser(input: {
  role: UserRole;
  mobile: string;
  name: string;
  restaurantId?: string;
  deliveryPartnerId?: string;
}) {
  const existing = await UserModel.findOne({ mobile: input.mobile });
  if (existing) return existing;
  return UserModel.create({ ...input, status: 'ACTIVE', permVersion: 1, mobileVerified: true });
}

async function seed(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the dev seed script with NODE_ENV=production — this is demo data only.');
  }

  await connectToDatabase();

  const admin = await upsertUser({ role: UserRole.ADMIN, mobile: '+910000000001', name: 'Demo Admin' });
  const customer = await upsertUser({ role: UserRole.CUSTOMER, mobile: '+910000000002', name: 'Demo Customer' });
  const restaurantOwnerUser = await upsertUser({ role: UserRole.RESTAURANT, mobile: '+910000000003', name: 'Demo Restaurant Owner' });
  const deliveryPartnerUser = await upsertUser({
    role: UserRole.DELIVERY_PARTNER,
    mobile: '+910000000004',
    name: 'Demo Delivery Partner',
  });

  let restaurant = await RestaurantModel.findOne({ ownerUserId: restaurantOwnerUser._id });
  if (!restaurant) {
    restaurant = await RestaurantModel.create({
      ownerUserId: restaurantOwnerUser._id,
      name: 'Demo Kitchen',
      description: 'Seeded demo restaurant for local development.',
      cuisines: ['Indian', 'Fast Food'],
      address: { line1: '1 Demo Street', city: 'Demo City', state: 'Demo State', pincode: '110001' },
      status: 'APPROVED',
      isOpen: true,
    });
  }
  if (!restaurantOwnerUser.restaurantId) {
    restaurantOwnerUser.restaurantId = restaurant._id as never;
    await restaurantOwnerUser.save();
  }

  let category = await MenuCategoryModel.findOne({ restaurantId: restaurant._id });
  if (!category) {
    category = await MenuCategoryModel.create({ restaurantId: restaurant._id, name: 'Mains', sortOrder: 1 });
  }

  const menuItemDefs = [
    { name: 'Butter Chicken', price: 32000, isVeg: false },
    { name: 'Paneer Tikka Masala', price: 28000, isVeg: true },
    { name: 'Veg Fried Rice', price: 18000, isVeg: true },
  ];
  for (const def of menuItemDefs) {
    const existingItem = await MenuItemModel.findOne({ restaurantId: restaurant._id, name: def.name });
    if (!existingItem) {
      await MenuItemModel.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: def.name,
        price: def.price,
        isVeg: def.isVeg,
        isAvailable: true,
      });
    }
  }

  let deliveryPartner = await DeliveryPartnerModel.findOne({ userId: deliveryPartnerUser._id });
  if (!deliveryPartner) {
    deliveryPartner = await DeliveryPartnerModel.create({
      userId: deliveryPartnerUser._id,
      personalDetails: { name: 'Demo Delivery Partner', mobile: '+910000000004', address: 'Demo City' },
      vehicleDetails: { type: 'BIKE', registrationNumber: 'DEMO1234' },
      bankDetails: { accountNumber: '0000000000', ifsc: 'DEMO0000001', accountHolder: 'Demo Delivery Partner' },
      status: 'APPROVED',
      availability: 'AVAILABLE',
    });
  }
  if (!deliveryPartnerUser.deliveryPartnerId) {
    deliveryPartnerUser.deliveryPartnerId = deliveryPartner._id as never;
    await deliveryPartnerUser.save();
  }

  const existingAddress = await AddressModel.findOne({ userId: customer._id });
  if (!existingAddress) {
    await AddressModel.create({
      userId: customer._id,
      label: 'Home',
      line1: '42 Sample Lane',
      city: 'Demo City',
      state: 'Demo State',
      pincode: '110002',
      isDefault: true,
    });
  }

  // Ensures the platform-config singleton exists with sane defaults (Phase 9) rather than being
  // created lazily on first admin/API read.
  await platformConfigService.getConfig();

  console.log('Seed complete:');
  console.log(`  ADMIN             mobile=${admin.mobile}`);
  console.log(`  CUSTOMER          mobile=${customer.mobile}`);
  console.log(`  RESTAURANT owner  mobile=${restaurantOwnerUser.mobile} (restaurant: ${restaurant.name})`);
  console.log(`  DELIVERY_PARTNER  mobile=${deliveryPartnerUser.mobile}`);
  console.log('Log in via OTP for any of the above mobiles — the OTP is logged to the console/notification channel (no SMS provider configured in dev).');
}

seed()
  .then(() => disconnectFromDatabase())
  .catch(async (err) => {
    console.error('[seed-dev] failed:', err);
    await disconnectFromDatabase();
    process.exitCode = 1;
  });
