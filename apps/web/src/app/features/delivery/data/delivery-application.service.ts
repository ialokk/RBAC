import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { DeliveryPartnerProfile } from './models';

export interface SubmitDeliveryApplicationInput {
  personalDetails: { name: string; mobile: string; email?: string; address: string };
  vehicleDetails: { type: string; registrationNumber: string };
  documents: { type: string; url: string }[];
  bankDetails: { accountNumber: string; ifsc: string; accountHolder: string };
}

@Injectable({ providedIn: 'root' })
export class DeliveryApplicationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  submit(input: SubmitDeliveryApplicationInput): Promise<DeliveryPartnerProfile> {
    return firstValueFrom(
      this.http.post<DeliveryPartnerProfile>(`${this.config.apiBaseUrl}/delivery/applications`, input),
    );
  }

  // Returns null (not an error) when the user has never submitted an application.
  getOwn(): Promise<DeliveryPartnerProfile | null> {
    return firstValueFrom(
      this.http.get<DeliveryPartnerProfile>(`${this.config.apiBaseUrl}/delivery/applications/me`).pipe(
        catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err))),
      ),
    );
  }
}
