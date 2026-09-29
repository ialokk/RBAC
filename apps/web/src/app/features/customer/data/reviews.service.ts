import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Review } from './models';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  create(input: { orderId: string; rating: number; comment?: string; deliveryPartnerRating?: number }): Promise<Review> {
    return firstValueFrom(this.http.post<Review>(`${this.config.apiBaseUrl}/reviews`, input));
  }
}
