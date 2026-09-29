import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { RatingBadgeComponent } from '../../../shared/ui/rating-badge/rating-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonCardsComponent } from '../../../shared/ui/skeleton/skeleton-cards.component';
import { FoodCardComponent } from '../../../shared/ui/food-card/food-card.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { CartStateService } from '../data/cart-state.service';
import { MenuService } from '../data/menu.service';
import { RestaurantsService } from '../data/restaurants.service';
import type { MenuCategory, MenuItem, Restaurant } from '../data/models';
import { BackButtonComponent } from '../../../shared/ui/back-button/back-button.component';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    RatingBadgeComponent,
    EmptyStateComponent,
    SkeletonCardsComponent,
    FoodCardComponent,
    MoneyPipe,
    BackButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-detail.component.html',
  styleUrl: './restaurant-detail.component.scss',
})
export class RestaurantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly menuService = inject(MenuService);
  private readonly cartState = inject(CartStateService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly restaurant = signal<Restaurant | null>(null);
  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly activeCategoryId = signal<string | null>(null);
  readonly vegOnly = signal(false);
  readonly busyItemId = signal<string | null>(null);

  readonly cart = this.cartState.cart;
  readonly cartCount = this.cartState.itemCount;

  readonly cartTotal = computed(() => this.cart().items.reduce((sum, item) => sum + item.price * item.qty, 0));

  readonly visibleItems = computed(() => {
    const categoryId = this.activeCategoryId();
    return this.items().filter(
      (item) => (!categoryId || item.categoryId === categoryId) && (!this.vegOnly() || item.isVeg),
    );
  });

  async ngOnInit(): Promise<void> {
    const restaurantId = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [restaurant, categories, items] = await Promise.all([
        this.restaurantsService.getById(restaurantId),
        this.menuService.listCategories(restaurantId),
        this.menuService.listItems(restaurantId),
      ]);
      this.restaurant.set(restaurant);
      this.categories.set(categories.items);
      this.items.set(items.items);
      void this.cartState.load();
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  filterByCategory(categoryId: string | null): void {
    this.activeCategoryId.set(categoryId);
  }

  toggleVegOnly(): void {
    this.vegOnly.update((value) => !value);
  }

  /** Cart lines are per-configuration, so the badge sums every line for this menu item. */
  qtyFor(item: MenuItem): number {
    return this.cart()
      .items.filter((line) => line.menuItemId === item._id)
      .reduce((sum, line) => sum + line.qty, 0);
  }

  async addItem(item: MenuItem): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant || this.busyItemId()) return;
    this.busyItemId.set(item._id);
    try {
      await this.cartState.addItem({
        restaurantId: restaurant._id,
        menuItemId: item._id,
        qty: 1,
        selectedAddonNames: [],
      });
    } finally {
      this.busyItemId.set(null);
    }
  }

  async decrementItem(item: MenuItem): Promise<void> {
    const line = this.cart().items.find((cartLine) => cartLine.menuItemId === item._id);
    if (!line || this.busyItemId()) return;
    this.busyItemId.set(item._id);
    try {
      if (line.qty <= 1) {
        await this.cartState.removeItem(line._id);
      } else {
        await this.cartState.updateItemQty(line._id, line.qty - 1);
      }
    } finally {
      this.busyItemId.set(null);
    }
  }
}
