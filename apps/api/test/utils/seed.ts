import { RestaurantModel } from '../../src/modules/restaurants/restaurant.model';
import { MenuCategoryModel } from '../../src/modules/menu/menu-category.model';
import { MenuItemModel } from '../../src/modules/menu/menu-item.model';
import { AddressModel } from '../../src/modules/addresses/address.model';
import { CartModel } from '../../src/modules/carts/cart.model';

// Seeds a full "ready to check out" fixture: an APPROVED restaurant with one menu item, a
// customer's delivery address, and a cart with that item already added.
export async function seedCheckoutFixture(customerId: string, restaurantOwnerId: string) {
  const restaurant = await RestaurantModel.create({
    ownerUserId: restaurantOwnerId,
    name: 'Test Restaurant',
    cuisines: ['Indian'],
    address: { line1: '1 Test St', city: 'Testville', state: 'TS', pincode: '100001' },
    status: 'APPROVED',
    isOpen: true,
  });

  const category = await MenuCategoryModel.create({ restaurantId: restaurant._id, name: 'Mains' });

  const menuItem = await MenuItemModel.create({
    restaurantId: restaurant._id,
    categoryId: category._id,
    name: 'Test Curry',
    price: 25000,
    isAvailable: true,
  });

  const address = await AddressModel.create({
    userId: customerId,
    label: 'Home',
    line1: '2 Customer Ave',
    city: 'Testville',
    state: 'TS',
    pincode: '100002',
  });

  const cart = await CartModel.create({
    userId: customerId,
    restaurantId: restaurant._id,
    items: [
      {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        qty: 2,
        selectedAddons: [],
      },
    ],
  });

  return { restaurant, category, menuItem, address, cart };
}
