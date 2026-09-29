import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { CartStateService } from '../data/cart-state.service';
import { MenuService } from '../data/menu.service';
import { RestaurantsService } from '../data/restaurants.service';
import type { MenuCategory, MenuItem, Restaurant } from '../data/models';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-detail.component.html',
})
export class RestaurantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly menuService = inject(MenuService);
  private readonly cartState = inject(CartStateService);

  readonly loading = signal(true);
  readonly restaurant = signal<Restaurant | null>(null);
  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly activeCategoryId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const restaurantId = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    try {
      const [restaurant, categories, items] = await Promise.all([
        this.restaurantsService.getById(restaurantId),
        this.menuService.listCategories(restaurantId),
        this.menuService.listItems(restaurantId),
      ]);
      this.restaurant.set(restaurant);
      this.categories.set(categories.items);
      this.items.set(items.items);
    } finally {
      this.loading.set(false);
    }
  }

  filterByCategory(categoryId: string | null): void {
    this.activeCategoryId.set(categoryId);
  }

  visibleItems(): MenuItem[] {
    const categoryId = this.activeCategoryId();
    return categoryId ? this.items().filter((item) => item.categoryId === categoryId) : this.items();
  }

  async quickAdd(item: MenuItem): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    await this.cartState.addItem({ restaurantId: restaurant._id, menuItemId: item._id, qty: 1, selectedAddonNames: [] });
  }
}
