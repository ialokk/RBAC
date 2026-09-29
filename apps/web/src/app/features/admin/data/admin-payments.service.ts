import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { AdminPayment, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class AdminPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(opts: { status?: string; gateway?: string; page?: number; limit?: number }): Promise<Paginated<AdminPayment>> {
    const params: Record<string, string> = { page: String(opts.page ?? 1), limit: String(opts.limit ?? 20) };
    if (opts.status) params['status'] = opts.status;
    if (opts.gateway) params['gateway'] = opts.gateway;
    return firstValueFrom(this.http.get<Paginated<AdminPayment>>(`${this.config.apiBaseUrl}/payments`, { params }));
  }

  refund(id: string, amount: number | undefined, reason: string): Promise<AdminPayment> {
    const body: Record<string, unknown> = { reason };
    if (amount !== undefined) body['amount'] = amount;
    return firstValueFrom(this.http.post<AdminPayment>(`${this.config.apiBaseUrl}/payments/${id}/refund`, body));
  }

  reconcileCod(id: string): Promise<AdminPayment> {
    return firstValueFrom(this.http.post<AdminPayment>(`${this.config.apiBaseUrl}/payments/${id}/reconcile-cod`, {}));
  }
}
