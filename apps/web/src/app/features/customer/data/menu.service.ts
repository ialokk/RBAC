import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { FoodAddonGroup, MenuCategory, MenuItem } from './models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  listCategories(restaurantId: string): Promise<{ items: MenuCategory[] }> {
    return firstValueFrom(
      this.http.get<{ items: MenuCategory[] }>(`${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu/categories`),
    );
  }

  listItems(restaurantId: string, categoryId?: string): Promise<{ items: MenuItem[] }> {
    const params: Record<string, string> = categoryId ? { categoryId } : {};
    return firstValueFrom(
      this.http.get<{ items: MenuItem[] }>(`${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu/items`, { params }),
    );
  }

  getItem(restaurantId: string, itemId: string): Promise<MenuItem> {
    return firstValueFrom(
      this.http.get<MenuItem>(`${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu/items/${itemId}`),
    );
  }

  listAddons(restaurantId: string): Promise<{ items: FoodAddonGroup[] }> {
    return firstValueFrom(
      this.http.get<{ items: FoodAddonGroup[] }>(`${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu/addons`),
    );
  }
}
