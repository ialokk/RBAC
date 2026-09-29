import { HttpError } from '../common/http-error';
import { FoodAddonModel, type FoodAddonDocument } from './food-addon.model';
import { MenuCategoryModel, type MenuCategoryDocument } from './menu-category.model';
import { MenuItemModel, type MenuItemVariation } from './menu-item.model';

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  isVeg: boolean;
  isAvailable: boolean;
  variations: MenuItemVariation[];
  addonGroupIds: string[];
  prepTimeMinutes: number;
}

export const menuService = {
  async listCategories(restaurantId: string) {
    return MenuCategoryModel.find({ restaurantId }).sort({ sortOrder: 1 });
  },

  async listItems(restaurantId: string, categoryId?: string) {
    const filter: Record<string, unknown> = { restaurantId };
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    return MenuItemModel.find(filter).sort({ name: 1 });
  },

  async listAddons(restaurantId: string) {
    return FoodAddonModel.find({ restaurantId });
  },

  async getItemOrThrow(restaurantId: string, itemId: string) {
    const item = await MenuItemModel.findOne({ _id: itemId, restaurantId });
    if (!item) {
      throw new HttpError(404, 'Menu item not found');
    }
    return item;
  },

  // --- Restaurant-owned write operations (Phase 4) ---

  async createCategory(restaurantId: string, input: Pick<MenuCategoryDocument, 'name' | 'sortOrder'>) {
    return MenuCategoryModel.create({ restaurantId, ...input });
  },

  async updateCategory(restaurantId: string, categoryId: string, input: Partial<Pick<MenuCategoryDocument, 'name' | 'sortOrder'>>) {
    const category = await MenuCategoryModel.findOneAndUpdate({ _id: categoryId, restaurantId }, { $set: input }, { new: true });
    if (!category) {
      throw new HttpError(404, 'Menu category not found');
    }
    return category;
  },

  async deleteCategory(restaurantId: string, categoryId: string) {
    const result = await MenuCategoryModel.deleteOne({ _id: categoryId, restaurantId });
    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Menu category not found');
    }
  },

  async createItem(
    restaurantId: string,
    input: MenuItemInput,
  ) {
    const category = await MenuCategoryModel.findOne({ _id: input.categoryId, restaurantId });
    if (!category) {
      throw new HttpError(400, 'categoryId does not belong to your restaurant');
    }
    return MenuItemModel.create({ restaurantId, ...input });
  },

  async updateItem(restaurantId: string, itemId: string, input: Partial<MenuItemInput>) {
    if (input.categoryId) {
      const category = await MenuCategoryModel.findOne({ _id: input.categoryId, restaurantId });
      if (!category) {
        throw new HttpError(400, 'categoryId does not belong to your restaurant');
      }
    }
    const item = await MenuItemModel.findOneAndUpdate({ _id: itemId, restaurantId }, { $set: input }, { new: true });
    if (!item) {
      throw new HttpError(404, 'Menu item not found');
    }
    return item;
  },

  async deleteItem(restaurantId: string, itemId: string) {
    const result = await MenuItemModel.deleteOne({ _id: itemId, restaurantId });
    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Menu item not found');
    }
  },

  async createAddon(restaurantId: string, input: Pick<FoodAddonDocument, 'groupName' | 'options' | 'maxSelectable'>) {
    return FoodAddonModel.create({ restaurantId, ...input });
  },

  async updateAddon(
    restaurantId: string,
    addonId: string,
    input: Partial<Pick<FoodAddonDocument, 'groupName' | 'options' | 'maxSelectable'>>,
  ) {
    const addon = await FoodAddonModel.findOneAndUpdate({ _id: addonId, restaurantId }, { $set: input }, { new: true });
    if (!addon) {
      throw new HttpError(404, 'Add-on group not found');
    }
    return addon;
  },

  async deleteAddon(restaurantId: string, addonId: string) {
    const result = await FoodAddonModel.deleteOne({ _id: addonId, restaurantId });
    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Add-on group not found');
    }
  },
};

