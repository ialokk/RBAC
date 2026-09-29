import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { RestaurantMenuService } from '../data/restaurant-menu.service';
import { RestaurantProfileService } from '../data/restaurant-profile.service';
import type { FoodAddonGroup, MenuCategory, MenuItem } from '../data/models';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.scss',
})
export class MenuManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(RestaurantMenuService);
  private readonly profileService = inject(RestaurantProfileService);

  private restaurantId = '';

  readonly loading = signal(true);
  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly addonGroups = signal<FoodAddonGroup[]>([]);

  readonly categoryForm = this.fb.nonNullable.group({ name: ['', Validators.required] });

  readonly itemForm = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    imageUrl: [''],
    isVeg: [true],
    isAvailable: [true],
    prepTimeMinutes: [15, [Validators.required, Validators.min(1)]],
  });

  readonly addonForm = this.fb.nonNullable.group({
    groupName: ['', Validators.required],
    optionName: ['', Validators.required],
    optionPrice: [0, [Validators.required, Validators.min(0)]],
    maxSelectable: [1, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const restaurant = await this.profileService.getOwn();
      this.restaurantId = restaurant._id;
      await this.reloadAll();
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadAll(): Promise<void> {
    const [categories, items, addons] = await Promise.all([
      this.menuService.listCategories(this.restaurantId),
      this.menuService.listItems(this.restaurantId),
      this.menuService.listAddons(this.restaurantId),
    ]);
    this.categories.set(categories.items);
    this.items.set(items.items);
    this.addonGroups.set(addons.items);
  }

  categoryName(categoryId: string): string {
    return this.categories().find((c) => c._id === categoryId)?.name ?? '—';
  }

  async addCategory(): Promise<void> {
    if (this.categoryForm.invalid) return;
    await this.menuService.createCategory(this.restaurantId, { name: this.categoryForm.getRawValue().name });
    this.categoryForm.reset({ name: '' });
    await this.reloadAll();
  }

  async deleteCategory(id: string): Promise<void> {
    await this.menuService.deleteCategory(this.restaurantId, id);
    await this.reloadAll();
  }

  async addItem(): Promise<void> {
    if (this.itemForm.invalid) return;
    const v = this.itemForm.getRawValue();
    await this.menuService.createItem(this.restaurantId, {
      categoryId: v.categoryId,
      name: v.name,
      description: v.description || undefined,
      price: v.price,
      images: v.imageUrl ? [v.imageUrl] : [],
      isVeg: v.isVeg,
      isAvailable: v.isAvailable,
      variations: [],
      addonGroupIds: [],
      prepTimeMinutes: v.prepTimeMinutes,
    });
    this.itemForm.reset({ categoryId: '', name: '', description: '', price: 0, imageUrl: '', isVeg: true, isAvailable: true, prepTimeMinutes: 15 });
    await this.reloadAll();
  }

  async toggleAvailability(item: MenuItem): Promise<void> {
    await this.menuService.updateItem(this.restaurantId, item._id, { isAvailable: !item.isAvailable });
    await this.reloadAll();
  }

  async deleteItem(id: string): Promise<void> {
    await this.menuService.deleteItem(this.restaurantId, id);
    await this.reloadAll();
  }

  async addAddonGroup(): Promise<void> {
    if (this.addonForm.invalid) return;
    const v = this.addonForm.getRawValue();
    await this.menuService.createAddon(this.restaurantId, {
      groupName: v.groupName,
      options: [{ name: v.optionName, price: v.optionPrice }],
      maxSelectable: v.maxSelectable,
    });
    this.addonForm.reset({ groupName: '', optionName: '', optionPrice: 0, maxSelectable: 1 });
    await this.reloadAll();
  }

  async deleteAddonGroup(id: string): Promise<void> {
    await this.menuService.deleteAddon(this.restaurantId, id);
    await this.reloadAll();
  }
}
