import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Reusable presentational building block — extended/styled with Angular Material as features land.
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="loading-spinner" role="status" aria-live="polite">{{ label() }}</div>`,
  styles: [
    `
      .loading-spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        color: var(--app-color-muted, #666);
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  readonly label = input('Loading…');
}
