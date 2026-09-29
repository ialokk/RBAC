import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonCardsComponent } from '../../../shared/ui/skeleton/skeleton-cards.component';
import { RestaurantCardComponent } from '../../../shared/ui/restaurant-card/restaurant-card.component';
import { RestaurantsService } from '../data/restaurants.service';
import type { Restaurant } from '../data/models';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SkeletonCardsComponent, RestaurantCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-list.component.html',
})
export class RestaurantListComponent implements OnInit {
  private readonly restaurantsService = inject(RestaurantsService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly restaurants = signal<Restaurant[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);

  readonly hasMore = computed(() => this.restaurants().length < this.total());

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const result = await this.restaurantsService.list({ page: this.page(), limit: 20 });
      this.restaurants.set(result.items);
      this.total.set(result.total);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    this.page.update((p) => p + 1);
    await this.load();
  }
}
