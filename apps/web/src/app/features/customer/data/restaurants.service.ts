import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Paginated, Restaurant } from './models';

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(params: { q?: string; cuisine?: string; page?: number; limit?: number } = {}): Promise<Paginated<Restaurant>> {
    return firstValueFrom(
      this.http.get<Paginated<Restaurant>>(`${this.config.apiBaseUrl}/restaurants`, { params: cleanParams(params) }),
    );
  }

  getById(id: string): Promise<Restaurant> {
    return firstValueFrom(this.http.get<Restaurant>(`${this.config.apiBaseUrl}/restaurants/${id}`));
  }
}

export function cleanParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}
