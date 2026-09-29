import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AdminDeliveryPartner, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class AdminDeliveryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  // Delivery partner "applications" and "partners" share one collection/endpoint —
  // omit status to see every partner regardless of state, per apps/api's delivery.router.ts.
  list(status?: string, page = 1, limit = 20): Promise<Paginated<AdminDeliveryPartner>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return firstValueFrom(
      this.http.get<Paginated<AdminDeliveryPartner>>(`${this.config.apiBaseUrl}/delivery/applications`, { params }),
    );
  }

  approve(id: string): Promise<AdminDeliveryPartner> {
    return firstValueFrom(
      this.http.patch<AdminDeliveryPartner>(`${this.config.apiBaseUrl}/delivery/applications/${id}/approve`, {}),
    );
  }

  reject(id: string, reason: string): Promise<AdminDeliveryPartner> {
    return firstValueFrom(
      this.http.patch<AdminDeliveryPartner>(`${this.config.apiBaseUrl}/delivery/applications/${id}/reject`, { reason }),
    );
  }

  suspend(id: string): Promise<AdminDeliveryPartner> {
    return firstValueFrom(
      this.http.patch<AdminDeliveryPartner>(`${this.config.apiBaseUrl}/delivery/partners/${id}/suspend`, {}),
    );
  }

  activate(id: string): Promise<AdminDeliveryPartner> {
    return firstValueFrom(
      this.http.patch<AdminDeliveryPartner>(`${this.config.apiBaseUrl}/delivery/partners/${id}/activate`, {}),
    );
  }
}
