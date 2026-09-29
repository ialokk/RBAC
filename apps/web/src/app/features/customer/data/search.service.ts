import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { MenuItem, Restaurant } from './models';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  searchRestaurants(q: string): Promise<{ items: Restaurant[] }> {
    return firstValueFrom(this.http.get<{ items: Restaurant[] }>(`${this.config.apiBaseUrl}/search/restaurants`, { params: { q } }));
  }

  searchFood(q: string): Promise<{ items: MenuItem[] }> {
    return firstValueFrom(this.http.get<{ items: MenuItem[] }>(`${this.config.apiBaseUrl}/search/food`, { params: { q } }));
  }
}
