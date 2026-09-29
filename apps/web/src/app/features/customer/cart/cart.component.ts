import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartStateService } from '../data/cart-state.service';
import type { PricingBreakdown } from '../data/models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.component.html',
})
export class CartComponent implements OnInit {
  readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);

  readonly couponCode = signal('');
  readonly pricing = signal<PricingBreakdown | null>(null);
  readonly couponError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cartState.load();
    await this.refreshPreview();
  }

  async refreshPreview(): Promise<void> {
    if (this.cartState.cart().items.length === 0) {
      this.pricing.set(null);
      return;
    }
    this.pricing.set(await this.cartState.checkoutPreview());
  }

  async changeQty(itemId: string, delta: number, currentQty: number): Promise<void> {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await this.cartState.removeItem(itemId);
    } else {
      await this.cartState.updateItemQty(itemId, newQty);
    }
    await this.refreshPreview();
  }

  async removeItem(itemId: string): Promise<void> {
    await this.cartState.removeItem(itemId);
    await this.refreshPreview();
  }

  async applyCoupon(): Promise<void> {
    this.couponError.set(null);
    try {
      await this.cartState.applyCoupon(this.couponCode());
      await this.refreshPreview();
    } catch {
      this.couponError.set('Coupon could not be applied');
    }
  }

  async removeCoupon(): Promise<void> {
    await this.cartState.removeCoupon();
    await this.refreshPreview();
  }

  goToCheckout(): void {
    this.router.navigateByUrl('/customer/checkout');
  }
}
