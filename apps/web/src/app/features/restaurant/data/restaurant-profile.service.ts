import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { OwnRestaurant } from './models';

@Injectable({ providedIn: 'root' })
export class RestaurantProfileService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getOwn(): Promise<OwnRestaurant> {
    return firstValueFrom(this.http.get<OwnRestaurant>(`${this.config.apiBaseUrl}/restaurants/me`));
  }

  // Returns null (not an error) when the account has no APPROVED restaurant yet (403).
  tryGetOwn(): Promise<OwnRestaurant | null> {
    return firstValueFrom(
      this.http.get<OwnRestaurant>(`${this.config.apiBaseUrl}/restaurants/me`).pipe(
        catchError((err: HttpErrorResponse) => (err.status === 403 ? of(null) : throwError(() => err))),
      ),
    );
  }

  updateOwn(input: Partial<Pick<OwnRestaurant, 'name' | 'description' | 'cuisines' | 'avgPrepTimeMinutes' | 'address'>>): Promise<OwnRestaurant> {
    return firstValueFrom(this.http.patch<OwnRestaurant>(`${this.config.apiBaseUrl}/restaurants/me`, input));
  }

  setOpenStatus(isOpen: boolean): Promise<OwnRestaurant> {
    return firstValueFrom(
      this.http.patch<OwnRestaurant>(`${this.config.apiBaseUrl}/restaurants/me/open-status`, { isOpen }),
    );
  }
}
