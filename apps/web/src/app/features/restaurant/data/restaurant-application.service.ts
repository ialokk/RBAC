import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { RestaurantApplication } from './models';

export interface SubmitApplicationInput {
  ownerDetails: { name: string; mobile: string; email?: string; idProof?: string };
  restaurantDetails: { name: string; cuisines: string[]; description?: string };
  address: { line1: string; city: string; state: string; pincode: string };
  documents: { type: string; url: string }[];
  bankDetails: { accountNumber: string; ifsc: string; accountHolder: string };
}

@Injectable({ providedIn: 'root' })
export class RestaurantApplicationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  submit(input: SubmitApplicationInput): Promise<RestaurantApplication> {
    return firstValueFrom(
      this.http.post<RestaurantApplication>(`${this.config.apiBaseUrl}/restaurant-applications`, input),
    );
  }

  // Returns null (not an error) when the user has never submitted an application.
  getOwn(): Promise<RestaurantApplication | null> {
    return firstValueFrom(
      this.http.get<RestaurantApplication>(`${this.config.apiBaseUrl}/restaurant-applications/me`).pipe(
        catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err))),
      ),
    );
  }
}
