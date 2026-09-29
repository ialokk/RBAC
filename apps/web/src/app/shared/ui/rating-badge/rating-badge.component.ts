import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Rating pill — colour shifts with the score so quality is scannable without reading the number.
@Component({
  selector: 'app-rating-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (count() > 0) {
      <span class="rating" [class]="tone()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />
        </svg>
        {{ value().toFixed(1) }}
      </span>
    } @else {
      <span class="rating is-new">New</span>
    }
  `,
  styles: [
    `
      .rating {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px var(--s-2);
        border-radius: var(--r-sm);
        background: var(--c-success);
        color: #fff;
        font-size: var(--f-xs);
        font-weight: 700;
        line-height: 1.5;
      }
      .rating.is-mid {
        background: #f0a020;
      }
      .rating.is-low {
        background: var(--c-ink-3);
      }
      .rating.is-new {
        background: var(--c-surface-3);
        color: var(--c-ink-3);
      }
    `,
  ],
})
export class RatingBadgeComponent {
  readonly value = input(0);
  readonly count = input(0);

  readonly tone = computed(() => {
    const value = this.value();
    if (value >= 4) return '';
    if (value >= 3) return 'is-mid';
    return 'is-low';
  });
}
