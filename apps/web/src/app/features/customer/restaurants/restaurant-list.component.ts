import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { RestaurantsService } from '../data/restaurants.service';
import type { Restaurant } from '../data/models';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-list.component.html',
})
export class RestaurantListComponent implements OnInit {
  private readonly restaurantsService = inject(RestaurantsService);

  readonly loading = signal(true);
  readonly restaurants = signal<Restaurant[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.restaurantsService.list({ page: this.page(), limit: 20 });
      this.restaurants.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    this.page.update((p) => p + 1);
    await this.load();
  }
}
