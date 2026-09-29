import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LocationService } from '../../../core/location/location.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonCardsComponent } from '../../../shared/ui/skeleton/skeleton-cards.component';
import { RestaurantCardComponent } from '../../../shared/ui/restaurant-card/restaurant-card.component';
import { PromoCarouselComponent, type PromoSlide } from '../../../shared/ui/promo-carousel/promo-carousel.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { RestaurantsService } from '../data/restaurants.service';
import { CartStateService } from '../data/cart-state.service';
import { AddressesService } from '../data/addresses.service';
import { CouponsService } from '../data/coupons.service';
import { OrdersService } from '../data/orders.service';
import { orderStatusLabel } from '../data/order-status-label';
import type { Coupon, Order, Restaurant } from '../data/models';

interface Category {
  name: string;
  icon: string;
  tint: string;
}

// Cuisine filters map 1:1 onto the existing `GET /restaurants?cuisine=` parameter.
const CATEGORIES: Category[] = [
  { name: 'North Indian', icon: '🍛', tint: '#fde6da' },
  { name: 'South Indian', icon: '🥘', tint: '#e3efe6' },
  { name: 'Chinese', icon: '🥡', tint: '#e5e9f7' },
  { name: 'Fast Food', icon: '🍔', tint: '#fbf0d9' },
  { name: 'Desserts', icon: '🍰', tint: '#f7e9f2' },
  { name: 'Beverages', icon: '🥤', tint: '#e4f1f5' },
];

const FALLBACK_SLIDES: PromoSlide[] = [
  { id: 'f1', title: 'Fresh food, fast delivery', subtitle: 'Discover kitchens near you and track every order live.', tint: '#fde6da' },
  { id: 'f2', title: 'Order together, save together', subtitle: 'Apply coupons at checkout for instant savings.', tint: '#e3efe6' },
];

const PROMO_TINTS = ['#fde6da', '#e3efe6', '#e5e9f7', '#fbf0d9', '#f7e9f2'];

@Component({
  selector: 'app-customer-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    EmptyStateComponent,
    SkeletonCardsComponent,
    RestaurantCardComponent,
    PromoCarouselComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly addressesService = inject(AddressesService);
  private readonly couponsService = inject(CouponsService);
  private readonly ordersService = inject(OrdersService);
  private readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;
  readonly statusLabel = orderStatusLabel;

  readonly locationLabel = signal('Set your delivery location');
  readonly locating = signal(false);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly restaurants = signal<Restaurant[]>([]);
  readonly activeCuisine = signal<string | null>(null);
  readonly coupons = signal<Coupon[]>([]);
  readonly recentOrders = signal<Order[]>([]);

  readonly cartCount = this.cartState.itemCount;
  readonly cart = this.cartState.cart;

  readonly cartTotal = computed(() =>
    this.cart().items.reduce((sum, item) => sum + item.price * item.qty, 0),
  );

  // Top-rated subset, shown as a separate "recommended" rail without a second API call.
  readonly recommended = computed(() =>
    [...this.restaurants()]
      .filter((restaurant) => restaurant.rating.count > 0)
      .sort((a, b) => b.rating.avg - a.rating.avg)
      .slice(0, 8),
  );

  readonly openRestaurants = computed(() => this.restaurants().filter((restaurant) => restaurant.isOpen));

  readonly slides = computed<PromoSlide[]>(() => {
    const fromCoupons = this.coupons().slice(0, 4).map((coupon, index) => ({
      id: coupon.code,
      badge: coupon.code,
      title:
        coupon.discountType === 'PERCENT'
          ? `${coupon.value}% off your order`
          : `Flat ₹${Math.round(coupon.value / 100)} off`,
      subtitle: coupon.minOrderValue
        ? `On orders above ₹${Math.round(coupon.minOrderValue / 100)}. Apply at checkout.`
        : 'Apply this code at checkout.',
      tint: PROMO_TINTS[index % PROMO_TINTS.length],
    }));
    return fromCoupons.length > 0 ? fromCoupons : FALLBACK_SLIDES;
  });

  async ngOnInit(): Promise<void> {
    await this.loadRestaurants();
    // Secondary rails are best-effort — none of them should block or break the home page.
    void this.loadSecondary();
  }

  async loadRestaurants(cuisine?: string | null): Promise<void> {
    this.activeCuisine.set(cuisine ?? null);
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const result = await this.restaurantsService.list({ cuisine: cuisine ?? undefined, limit: 12 });
      this.restaurants.set(result.items);
    } catch {
      this.loadError.set(true);
      this.restaurants.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSecondary(): Promise<void> {
    const [addresses, coupons, orders] = await Promise.allSettled([
      this.addressesService.list(),
      this.couponsService.applicable(),
      this.ordersService.history(1, 5),
      this.cartState.load(),
    ]);

    if (addresses.status === 'fulfilled') {
      const preferred = addresses.value.items.find((address) => address.isDefault) ?? addresses.value.items[0];
      if (preferred) {
        this.locationLabel.set(`${preferred.label} · ${preferred.line1}, ${preferred.city}`);
      }
    }
    if (coupons.status === 'fulfilled') {
      this.coupons.set(coupons.value.items);
    }
    if (orders.status === 'fulfilled') {
      this.recentOrders.set(orders.value.items);
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.locating.set(true);
    try {
      const position = await this.locationService.getCurrentPosition();
      this.locationLabel.set(`Near ${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}`);
    } catch {
      this.locationLabel.set('Location unavailable — pick a saved address');
    } finally {
      this.locating.set(false);
    }
  }

  goToSearch(): void {
    void this.router.navigateByUrl('/customer/search');
  }
}
