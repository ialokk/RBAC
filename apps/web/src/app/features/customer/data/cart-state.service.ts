import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config.token';
import type { Cart, PricingBreakdown } from './models';

const EMPTY_CART: Cart = { _id: '', items: [] };

// Cart state lives server-side (single active cart per customer); this service keeps a local
// signal mirror so components re-render reactively without re-fetching after every mutation.
@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  private readonly cartSignal = signal<Cart>(EMPTY_CART);
  readonly cart = this.cartSignal.asReadonly();
  readonly itemCount = computed(() => this.cartSignal().items.reduce((sum, item) => sum + item.qty, 0));

  async load(): Promise<void> {
    this.cartSignal.set(await firstValueFrom(this.http.get<Cart>(`${this.config.apiBaseUrl}/cart`)));
  }

  async addItem(input: {
    restaurantId: string;
    menuItemId: string;
    qty: number;
    selectedVariationName?: string;
    selectedAddonNames?: string[];
    instructions?: string;
  }): Promise<void> {
    this.cartSignal.set(await firstValueFrom(this.http.post<Cart>(`${this.config.apiBaseUrl}/cart/items`, input)));
  }

  async updateItemQty(itemRef: string, qty: number): Promise<void> {
    this.cartSignal.set(
      await firstValueFrom(this.http.patch<Cart>(`${this.config.apiBaseUrl}/cart/items/${itemRef}`, { qty })),
    );
  }

  async removeItem(itemRef: string): Promise<void> {
    this.cartSignal.set(await firstValueFrom(this.http.delete<Cart>(`${this.config.apiBaseUrl}/cart/items/${itemRef}`)));
  }

  async applyCoupon(code: string): Promise<void> {
    this.cartSignal.set(await firstValueFrom(this.http.post<Cart>(`${this.config.apiBaseUrl}/cart/coupon`, { code })));
  }

  async removeCoupon(): Promise<void> {
    this.cartSignal.set(await firstValueFrom(this.http.delete<Cart>(`${this.config.apiBaseUrl}/cart/coupon`)));
  }

  checkoutPreview(): Promise<PricingBreakdown> {
    return firstValueFrom(this.http.post<PricingBreakdown>(`${this.config.apiBaseUrl}/cart/checkout-preview`, {}));
  }

  clearLocal(): void {
    this.cartSignal.set(EMPTY_CART);
  }
}
