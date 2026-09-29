import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { DeliveryAssignment, EarningsSummary, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class DeliveryAssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  setAvailability(availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE'): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${this.config.apiBaseUrl}/delivery/me/availability`, { availability }));
  }

  listAvailable(): Promise<{ items: DeliveryAssignment[] }> {
    return firstValueFrom(
      this.http.get<{ items: DeliveryAssignment[] }>(`${this.config.apiBaseUrl}/delivery/assignments/available`),
    );
  }

  current(): Promise<DeliveryAssignment | null> {
    return firstValueFrom(this.http.get<DeliveryAssignment | null>(`${this.config.apiBaseUrl}/delivery/assignments/current`));
  }

  accept(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/accept`, {}),
    );
  }

  decline(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/decline`, {}),
    );
  }

  arrivedAtRestaurant(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/arrived-restaurant`, {}),
    );
  }

  pickedUp(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/picked-up`, {}),
    );
  }

  arrivedAtCustomer(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/arrived-customer`, {}),
    );
  }

  verifyOtp(assignmentId: string, code: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/verify-otp`, { code }),
    );
  }

  markDelivered(assignmentId: string): Promise<DeliveryAssignment> {
    return firstValueFrom(
      this.http.post<DeliveryAssignment>(`${this.config.apiBaseUrl}/delivery/assignments/${assignmentId}/mark-delivered`, {}),
    );
  }

  sendLocationHeartbeat(lat: number, lng: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.config.apiBaseUrl}/delivery/location`, { lat, lng }));
  }

  history(page = 1, limit = 20): Promise<Paginated<DeliveryAssignment>> {
    return firstValueFrom(
      this.http.get<Paginated<DeliveryAssignment>>(`${this.config.apiBaseUrl}/delivery/history`, {
        params: { page: String(page), limit: String(limit) },
      }),
    );
  }

  earnings(): Promise<EarningsSummary> {
    return firstValueFrom(this.http.get<EarningsSummary>(`${this.config.apiBaseUrl}/delivery/earnings`));
  }
}
