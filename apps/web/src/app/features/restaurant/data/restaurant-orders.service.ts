import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { DashboardSummary, Paginated, RestaurantOrder } from './models';

@Injectable({ providedIn: 'root' })
export class RestaurantOrdersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(status?: string, page = 1, limit = 20): Promise<Paginated<RestaurantOrder>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return firstValueFrom(this.http.get<Paginated<RestaurantOrder>>(`${this.config.apiBaseUrl}/orders`, { params }));
  }

  summary(): Promise<DashboardSummary> {
    return firstValueFrom(this.http.get<DashboardSummary>(`${this.config.apiBaseUrl}/orders/summary`));
  }

  accept(orderId: string): Promise<RestaurantOrder> {
    return firstValueFrom(this.http.post<RestaurantOrder>(`${this.config.apiBaseUrl}/orders/${orderId}/restaurant-accept`, {}));
  }

  reject(orderId: string, reason: string): Promise<RestaurantOrder> {
    return firstValueFrom(
      this.http.post<RestaurantOrder>(`${this.config.apiBaseUrl}/orders/${orderId}/restaurant-reject`, { reason }),
    );
  }

  setPrepTime(orderId: string, prepTimeMinutes: number): Promise<RestaurantOrder> {
    return firstValueFrom(
      this.http.post<RestaurantOrder>(`${this.config.apiBaseUrl}/orders/${orderId}/set-prep-time`, { prepTimeMinutes }),
    );
  }

  markPreparing(orderId: string): Promise<RestaurantOrder> {
    return firstValueFrom(this.http.post<RestaurantOrder>(`${this.config.apiBaseUrl}/orders/${orderId}/mark-preparing`, {}));
  }

  markReady(orderId: string): Promise<RestaurantOrder> {
    return firstValueFrom(this.http.post<RestaurantOrder>(`${this.config.apiBaseUrl}/orders/${orderId}/mark-ready`, {}));
  }
}
