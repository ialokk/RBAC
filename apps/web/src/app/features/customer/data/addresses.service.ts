import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Address } from './models';

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  list(): Promise<{ items: Address[] }> {
    return firstValueFrom(this.http.get<{ items: Address[] }>(`${this.config.apiBaseUrl}/addresses`));
  }

  create(input: Omit<Address, '_id'>): Promise<Address> {
    return firstValueFrom(this.http.post<Address>(`${this.config.apiBaseUrl}/addresses`, input));
  }

  update(id: string, input: Partial<Omit<Address, '_id'>>): Promise<Address> {
    return firstValueFrom(this.http.patch<Address>(`${this.config.apiBaseUrl}/addresses/${id}`, input));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.apiBaseUrl}/addresses/${id}`));
  }
}
