import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { FoodAddonGroup, MenuCategory, MenuItem } from './models';

@Injectable({ providedIn: 'root' })
export class RestaurantMenuService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  private base(restaurantId: string): string {
    return `${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu`;
  }

  listCategories(restaurantId: string): Promise<{ items: MenuCategory[] }> {
    return firstValueFrom(this.http.get<{ items: MenuCategory[] }>(`${this.base(restaurantId)}/categories`));
  }

  createCategory(restaurantId: string, input: { name: string; sortOrder?: number }): Promise<MenuCategory> {
    return firstValueFrom(this.http.post<MenuCategory>(`${this.base(restaurantId)}/categories`, input));
  }

  updateCategory(restaurantId: string, id: string, input: Partial<{ name: string; sortOrder: number }>): Promise<MenuCategory> {
    return firstValueFrom(this.http.patch<MenuCategory>(`${this.base(restaurantId)}/categories/${id}`, input));
  }

  deleteCategory(restaurantId: string, id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base(restaurantId)}/categories/${id}`));
  }

  listItems(restaurantId: string): Promise<{ items: MenuItem[] }> {
    return firstValueFrom(this.http.get<{ items: MenuItem[] }>(`${this.base(restaurantId)}/items`));
  }

  createItem(restaurantId: string, input: Omit<MenuItem, '_id'>): Promise<MenuItem> {
    return firstValueFrom(this.http.post<MenuItem>(`${this.base(restaurantId)}/items`, input));
  }

  updateItem(restaurantId: string, id: string, input: Partial<Omit<MenuItem, '_id'>>): Promise<MenuItem> {
    return firstValueFrom(this.http.patch<MenuItem>(`${this.base(restaurantId)}/items/${id}`, input));
  }

  deleteItem(restaurantId: string, id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base(restaurantId)}/items/${id}`));
  }

  listAddons(restaurantId: string): Promise<{ items: FoodAddonGroup[] }> {
    return firstValueFrom(this.http.get<{ items: FoodAddonGroup[] }>(`${this.base(restaurantId)}/addons`));
  }

  createAddon(restaurantId: string, input: Omit<FoodAddonGroup, '_id'>): Promise<FoodAddonGroup> {
    return firstValueFrom(this.http.post<FoodAddonGroup>(`${this.base(restaurantId)}/addons`, input));
  }

  updateAddon(restaurantId: string, id: string, input: Partial<Omit<FoodAddonGroup, '_id'>>): Promise<FoodAddonGroup> {
    return firstValueFrom(this.http.patch<FoodAddonGroup>(`${this.base(restaurantId)}/addons/${id}`, input));
  }

  deleteAddon(restaurantId: string, id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base(restaurantId)}/addons/${id}`));
  }
}
