import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AdminUser, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(opts: { role?: string; status?: string; q?: string; page?: number; limit?: number }): Promise<Paginated<AdminUser>> {
    const params: Record<string, string> = { page: String(opts.page ?? 1), limit: String(opts.limit ?? 20) };
    if (opts.role) params['role'] = opts.role;
    if (opts.status) params['status'] = opts.status;
    if (opts.q) params['q'] = opts.q;
    return firstValueFrom(this.http.get<Paginated<AdminUser>>(`${this.config.apiBaseUrl}/users`, { params }));
  }

  getById(id: string): Promise<AdminUser> {
    return firstValueFrom(this.http.get<AdminUser>(`${this.config.apiBaseUrl}/users/${id}`));
  }

  setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<AdminUser> {
    return firstValueFrom(this.http.patch<AdminUser>(`${this.config.apiBaseUrl}/users/${id}/status`, { status }));
  }
}
