import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" [class.is-error]="tone() === 'error'">
      <span class="empty__icon"><app-icon [name]="icon()" [size]="24" /></span>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p class="text-muted text-sm">{{ message() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="btn btn-secondary btn-sm" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--s-2);
        padding: var(--s-10) var(--s-4);
      }
      .empty h3 {
        margin: 0;
        font-size: var(--f-md);
      }
      .empty p {
        margin: 0;
        max-width: 42ch;
      }
      .empty__icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        margin-bottom: var(--s-1);
        border-radius: var(--r-pill);
        background: var(--c-surface-3);
        color: var(--c-ink-3);
      }
      .empty.is-error .empty__icon {
        background: var(--c-danger-soft);
        color: var(--c-danger);
      }
      button {
        margin-top: var(--s-2);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('search');
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly tone = input<'empty' | 'error'>('empty');
  readonly action = output<void>();
}
