import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Cart, Order, OrderTracking, PaymentMethod, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  place(addressId: string, paymentMethod: PaymentMethod): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(`${this.config.apiBaseUrl}/orders`, { addressId, paymentMethod }));
  }

  history(page = 1, limit = 20): Promise<Paginated<Order>> {
    return firstValueFrom(this.http.get<Paginated<Order>>(`${this.config.apiBaseUrl}/orders`, { params: { page, limit } }));
  }

  current(): Promise<Order | null> {
    return firstValueFrom(this.http.get<Order | null>(`${this.config.apiBaseUrl}/orders/current`));
  }

  getById(id: string): Promise<Order> {
    return firstValueFrom(this.http.get<Order>(`${this.config.apiBaseUrl}/orders/${id}`));
  }

  cancel(id: string, reason: string): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(`${this.config.apiBaseUrl}/orders/${id}/cancel`, { reason }));
  }

  reorder(id: string): Promise<{ cart: Cart; skippedItems: string[] }> {
    return firstValueFrom(
      this.http.post<{ cart: Cart; skippedItems: string[] }>(`${this.config.apiBaseUrl}/orders/${id}/reorder`, {}),
    );
  }

  tracking(id: string): Promise<OrderTracking> {
    return firstValueFrom(this.http.get<OrderTracking>(`${this.config.apiBaseUrl}/orders/${id}/tracking`));
  }
}
