import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService } from '../data/search.service';
import type { MenuItem, Restaurant } from '../data/models';

@Component({
  selector: 'app-customer-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.component.html',
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  readonly query = signal('');
  readonly loading = signal(false);
  readonly restaurantResults = signal<Restaurant[]>([]);
  readonly foodResults = signal<MenuItem[]>([]);

  onQueryChange(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceHandle);
    if (value.trim().length < 2) {
      this.restaurantResults.set([]);
      this.foodResults.set([]);
      return;
    }
    this.debounceHandle = setTimeout(() => this.runSearch(value.trim()), 300);
  }

  private async runSearch(q: string): Promise<void> {
    this.loading.set(true);
    try {
      const [restaurants, food] = await Promise.all([
        this.searchService.searchRestaurants(q),
        this.searchService.searchFood(q),
      ]);
      this.restaurantResults.set(restaurants.items);
      this.foodResults.set(food.items);
    } finally {
      this.loading.set(false);
    }
  }
}
