import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MoneyPipe } from '../money.pipe';
import type { MenuItem } from '../../../features/customer/data/models';

@Component({
  selector: 'app-food-card',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fc card" [class.is-unavailable]="!item().isAvailable">
      <div class="fc__body">
        <span class="fc__diet" [class.is-veg]="item().isVeg" [attr.aria-label]="item().isVeg ? 'Vegetarian' : 'Non-vegetarian'">
          <span></span>
        </span>
        <h3>{{ item().name }}</h3>
        <p class="fc__price">{{ item().price | money }}</p>
        @if (item().description) {
          <p class="fc__desc text-sm text-muted">{{ item().description }}</p>
        }
      </div>

      <div class="fc__media">
        @if (item().images.length) {
          <img [src]="item().images[0]" [alt]="item().name" loading="lazy" />
        } @else {
          <div class="fc__placeholder" aria-hidden="true">{{ item().name.charAt(0).toUpperCase() }}</div>
        }

        @if (!item().isAvailable) {
          <span class="badge fc__badge">Unavailable</span>
        } @else if (qty() > 0) {
          <div class="qty" role="group" [attr.aria-label]="'Quantity of ' + item().name">
            <button type="button" (click)="decrement.emit(item())" [attr.aria-label]="'Remove one ' + item().name">−</button>
            <span>{{ qty() }}</span>
            <button type="button" (click)="increment.emit(item())" [attr.aria-label]="'Add one ' + item().name">+</button>
          </div>
        } @else {
          <button type="button" class="btn btn-secondary btn-sm fc__add" (click)="add.emit(item())">ADD</button>
        }
      </div>
    </article>
  `,
  styleUrl: './food-card.component.scss',
})
export class FoodCardComponent {
  readonly item = input.required<MenuItem>();
  /** Current quantity in the cart; 0 renders the ADD button instead of the stepper. */
  readonly qty = input(0);
  readonly add = output<MenuItem>();
  readonly increment = output<MenuItem>();
  readonly decrement = output<MenuItem>();
}
