import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Coupon, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class AdminCouponsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(page = 1, limit = 20): Promise<Paginated<Coupon>> {
    return firstValueFrom(
      this.http.get<Paginated<Coupon>>(`${this.config.apiBaseUrl}/coupons`, { params: { page: String(page), limit: String(limit) } }),
    );
  }

  create(input: Partial<Coupon>): Promise<Coupon> {
    return firstValueFrom(this.http.post<Coupon>(`${this.config.apiBaseUrl}/coupons`, input));
  }

  update(id: string, input: Partial<Coupon>): Promise<Coupon> {
    return firstValueFrom(this.http.patch<Coupon>(`${this.config.apiBaseUrl}/coupons/${id}`, input));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.apiBaseUrl}/coupons/${id}`));
  }
}
