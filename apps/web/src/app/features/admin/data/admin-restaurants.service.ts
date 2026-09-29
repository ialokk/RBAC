import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AdminRestaurant, Paginated, RestaurantApplication } from './models';

@Injectable({ providedIn: 'root' })
export class AdminRestaurantsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(status?: string, page = 1, limit = 20): Promise<Paginated<AdminRestaurant>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return firstValueFrom(
      this.http.get<Paginated<AdminRestaurant>>(`${this.config.apiBaseUrl}/restaurants/admin/all`, { params }),
    );
  }

  suspend(id: string): Promise<AdminRestaurant> {
    return firstValueFrom(this.http.patch<AdminRestaurant>(`${this.config.apiBaseUrl}/restaurants/${id}/suspend`, {}));
  }

  activate(id: string): Promise<AdminRestaurant> {
    return firstValueFrom(this.http.patch<AdminRestaurant>(`${this.config.apiBaseUrl}/restaurants/${id}/activate`, {}));
  }

  listApplications(status?: string, page = 1, limit = 20): Promise<Paginated<RestaurantApplication>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return firstValueFrom(
      this.http.get<Paginated<RestaurantApplication>>(`${this.config.apiBaseUrl}/restaurant-applications`, { params }),
    );
  }

  approveApplication(id: string): Promise<RestaurantApplication> {
    return firstValueFrom(
      this.http.patch<RestaurantApplication>(`${this.config.apiBaseUrl}/restaurant-applications/${id}/approve`, {}),
    );
  }

  rejectApplication(id: string, reason: string): Promise<RestaurantApplication> {
    return firstValueFrom(
      this.http.patch<RestaurantApplication>(`${this.config.apiBaseUrl}/restaurant-applications/${id}/reject`, { reason }),
    );
  }
}
