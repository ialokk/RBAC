import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocationService } from '../../../core/location/location.service';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { RestaurantsService } from '../data/restaurants.service';
import type { Restaurant } from '../data/models';

const CATEGORIES = ['North Indian', 'South Indian', 'Chinese', 'Fast Food', 'Desserts', 'Beverages'];

@Component({
  selector: 'app-customer-home',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly restaurantsService = inject(RestaurantsService);

  readonly categories = CATEGORIES;
  readonly locationLabel = signal('Set your delivery location');
  readonly locating = signal(false);
  readonly loading = signal(true);
  readonly restaurants = signal<Restaurant[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadRestaurants();
  }

  async loadRestaurants(cuisine?: string): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.restaurantsService.list({ cuisine, limit: 12 });
      this.restaurants.set(result.items);
    } finally {
      this.loading.set(false);
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.locating.set(true);
    try {
      const position = await this.locationService.getCurrentPosition();
      this.locationLabel.set(`Lat ${position.lat.toFixed(4)}, Lng ${position.lng.toFixed(4)}`);
    } catch {
      this.locationLabel.set('Could not access location — enter your address instead');
    } finally {
      this.locating.set(false);
    }
  }
}
