import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type {
  AuditLogEntry,
  Banner,
  DashboardSummary,
  Offer,
  Paginated,
  PlatformConfig,
} from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private get base() {
    return `${this.config.apiBaseUrl}/admin`;
  }

  dashboard(): Promise<DashboardSummary> {
    return firstValueFrom(this.http.get<DashboardSummary>(`${this.base}/dashboard`));
  }

  reportOrders(from?: string, to?: string): Promise<unknown> {
    return this.getReport('orders', from, to);
  }
  reportSales(from?: string, to?: string): Promise<unknown> {
    return this.getReport('sales', from, to);
  }
  reportRestaurants(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/reports/restaurants`));
  }
  reportDeliveryPartners(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/reports/delivery-partners`));
  }
  reportCustomers(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/reports/customers`));
  }
  private getReport(name: string, from?: string, to?: string): Promise<unknown> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return firstValueFrom(this.http.get(`${this.base}/reports/${name}`, { params }));
  }

  getConfig(): Promise<PlatformConfig> {
    return firstValueFrom(this.http.get<PlatformConfig>(`${this.base}/config`));
  }
  updateConfig(input: Partial<PlatformConfig>): Promise<PlatformConfig> {
    return firstValueFrom(this.http.patch<PlatformConfig>(`${this.base}/config`, input));
  }

  listAuditLogs(page = 1, limit = 20, action?: string, targetType?: string): Promise<Paginated<AuditLogEntry>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (action) params['action'] = action;
    if (targetType) params['targetType'] = targetType;
    return firstValueFrom(this.http.get<Paginated<AuditLogEntry>>(`${this.base}/audit-logs`, { params }));
  }

  listBanners(page = 1, limit = 20): Promise<Paginated<Banner>> {
    return firstValueFrom(
      this.http.get<Paginated<Banner>>(`${this.base}/banners`, { params: { page: String(page), limit: String(limit) } }),
    );
  }
  createBanner(input: Partial<Banner>): Promise<Banner> {
    return firstValueFrom(this.http.post<Banner>(`${this.base}/banners`, input));
  }
  updateBanner(id: string, input: Partial<Banner>): Promise<Banner> {
    return firstValueFrom(this.http.patch<Banner>(`${this.base}/banners/${id}`, input));
  }
  deleteBanner(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/banners/${id}`));
  }

  listOffers(page = 1, limit = 20): Promise<Paginated<Offer>> {
    return firstValueFrom(
      this.http.get<Paginated<Offer>>(`${this.base}/offers`, { params: { page: String(page), limit: String(limit) } }),
    );
  }
  createOffer(input: Partial<Offer>): Promise<Offer> {
    return firstValueFrom(this.http.post<Offer>(`${this.base}/offers`, input));
  }
  updateOffer(id: string, input: Partial<Offer>): Promise<Offer> {
    return firstValueFrom(this.http.patch<Offer>(`${this.base}/offers/${id}`, input));
  }
  deleteOffer(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/offers/${id}`));
  }
}
