import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AdminOrder, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(status?: string, page = 1, limit = 20): Promise<Paginated<AdminOrder>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return firstValueFrom(this.http.get<Paginated<AdminOrder>>(`${this.config.apiBaseUrl}/orders`, { params }));
  }

  getById(id: string): Promise<AdminOrder> {
    return firstValueFrom(this.http.get<AdminOrder>(`${this.config.apiBaseUrl}/orders/${id}`));
  }

  cancel(id: string, reason: string): Promise<AdminOrder> {
    return firstValueFrom(this.http.post<AdminOrder>(`${this.config.apiBaseUrl}/orders/${id}/cancel`, { reason }));
  }

  reassignDelivery(id: string): Promise<AdminOrder> {
    return firstValueFrom(this.http.post<AdminOrder>(`${this.config.apiBaseUrl}/orders/${id}/reassign-delivery`, {}));
  }
}
