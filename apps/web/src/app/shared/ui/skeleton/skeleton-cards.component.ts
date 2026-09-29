import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Card-shaped loading placeholder — `count` renders a whole grid of them in one tag.
@Component({
  selector: 'app-skeleton-cards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk-grid" [class.sk-grid--row]="layout() === 'row'" aria-hidden="true">
      @for (item of items(); track item) {
        <div class="sk-card">
          <div class="skeleton sk-card__media"></div>
          <div class="skeleton sk-card__line sk-card__line--lg"></div>
          <div class="skeleton sk-card__line"></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sk-grid {
        display: grid;
        gap: var(--s-4);
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
      }
      .sk-grid--row {
        display: flex;
        gap: var(--s-3);
        overflow: hidden;
      }
      .sk-grid--row .sk-card {
        flex: 0 0 240px;
      }
      .sk-card {
        display: flex;
        flex-direction: column;
        gap: var(--s-2);
      }
      .sk-card__media {
        aspect-ratio: 16 / 10;
        border-radius: var(--r-lg);
      }
      .sk-card__line {
        height: 10px;
        width: 60%;
        border-radius: var(--r-sm);
      }
      .sk-card__line--lg {
        height: 14px;
        width: 85%;
      }
    `,
  ],
})
export class SkeletonCardsComponent {
  readonly count = input(6);
  readonly layout = input<'grid' | 'row'>('grid');
  readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
