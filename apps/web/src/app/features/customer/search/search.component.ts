import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonCardsComponent } from '../../../shared/ui/skeleton/skeleton-cards.component';
import { RestaurantCardComponent } from '../../../shared/ui/restaurant-card/restaurant-card.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { SearchService } from '../data/search.service';
import type { MenuItem, Restaurant } from '../data/models';

@Component({
  selector: 'app-customer-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    EmptyStateComponent,
    SkeletonCardsComponent,
    RestaurantCardComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnDestroy {
  private readonly searchService = inject(SearchService);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  readonly query = signal('');
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly loadError = signal(false);
  readonly restaurantResults = signal<Restaurant[]>([]);
  readonly foodResults = signal<MenuItem[]>([]);

  readonly hasResults = computed(() => this.restaurantResults().length > 0 || this.foodResults().length > 0);

  onQueryChange(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceHandle);
    if (value.trim().length < 2) {
      this.restaurantResults.set([]);
      this.foodResults.set([]);
      this.searched.set(false);
      return;
    }
    this.debounceHandle = setTimeout(() => void this.runSearch(value.trim()), 300);
  }

  clear(): void {
    this.onQueryChange('');
  }

  private async runSearch(q: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [restaurants, food] = await Promise.all([
        this.searchService.searchRestaurants(q),
        this.searchService.searchFood(q),
      ]);
      this.restaurantResults.set(restaurants.items);
      this.foodResults.set(food.items);
    } catch {
      this.loadError.set(true);
      this.restaurantResults.set([]);
      this.foodResults.set([]);
    } finally {
      this.loading.set(false);
      this.searched.set(true);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceHandle);
  }
}
