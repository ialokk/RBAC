import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Coupon } from './models';

@Injectable({ providedIn: 'root' })
export class CouponsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  applicable(): Promise<{ items: Coupon[] }> {
    return firstValueFrom(this.http.get<{ items: Coupon[] }>(`${this.config.apiBaseUrl}/coupons/applicable`));
  }
}
