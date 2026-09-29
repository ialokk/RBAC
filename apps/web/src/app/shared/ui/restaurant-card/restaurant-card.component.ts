import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RatingBadgeComponent } from '../rating-badge/rating-badge.component';
import type { Restaurant } from '../../../features/customer/data/models';

// Deterministic tint so a restaurant always gets the same placeholder art — the API has no
// image field yet, and a stable colour reads better than a grey box.
const TINTS = ['#fde6da', '#e3efe6', '#e5e9f7', '#f7e9f2', '#fbf0d9', '#e4f1f5'];

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [RouterLink, RatingBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="rc card card-interactive" [routerLink]="['/customer/restaurants', restaurant()._id]">
      <div class="rc__media" [style.background]="tint()">
        <span class="rc__monogram" aria-hidden="true">{{ monogram() }}</span>
        @if (!restaurant().isOpen) {
          <span class="rc__closed">Currently closed</span>
        }
        @if (restaurant().cuisines.length) {
          <span class="rc__offer badge badge-primary">{{ restaurant().cuisines[0] }}</span>
        }
      </div>

      <div class="rc__body">
        <div class="rc__title">
          <h3>{{ restaurant().name }}</h3>
          <app-rating-badge [value]="restaurant().rating.avg" [count]="restaurant().rating.count" />
        </div>
        <p class="rc__cuisines text-sm text-muted">{{ restaurant().cuisines.join(' • ') || 'Multi-cuisine' }}</p>
        <div class="rc__meta text-xs text-muted">
          <span>{{ restaurant().avgPrepTimeMinutes || 30 }} min</span>
          <span aria-hidden="true">·</span>
          <span>{{ restaurant().address.city }}</span>
        </div>
      </div>
    </a>
  `,
  styleUrl: './restaurant-card.component.scss',
})
export class RestaurantCardComponent {
  readonly restaurant = input.required<Restaurant>();

  readonly monogram = computed(() => this.restaurant().name.trim().charAt(0).toUpperCase() || '?');

  readonly tint = computed(() => {
    const name = this.restaurant().name;
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % TINTS.length;
    return TINTS[hash];
  });
}
