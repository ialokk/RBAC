import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AppNotification } from './models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(): Promise<{ items: AppNotification[] }> {
    return firstValueFrom(this.http.get<{ items: AppNotification[] }>(`${this.config.apiBaseUrl}/notifications`));
  }

  markRead(id: string): Promise<AppNotification> {
    return firstValueFrom(this.http.patch<AppNotification>(`${this.config.apiBaseUrl}/notifications/${id}/read`, {}));
  }
}
