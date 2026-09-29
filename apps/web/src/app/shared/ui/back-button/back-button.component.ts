import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="back-button" (click)="goBack()" [attr.aria-label]="label">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      @if (showLabel) {
        <span>{{ label }}</span>
      }
    </button>
  `,
  styles: [
    `
      .back-button {
        display: inline-flex;
        align-items: center;
        gap: var(--s-2);
        padding: var(--s-2) 0;
        margin-bottom: var(--s-4);
        background: transparent;
        border: none;
        color: var(--c-ink-2);
        font-size: var(--f-sm);
        font-weight: 500;
        cursor: pointer;
        transition: color var(--t-fast);
      }
      .back-button:hover,
      .back-button:focus-visible {
        color: var(--c-primary);
      }
      .back-button:focus-visible {
        outline: none;
        box-shadow: var(--e-focus);
        border-radius: var(--r-sm);
      }
    `,
  ],
})
export class BackButtonComponent {
  @Input() label = 'Back';
  @Input() showLabel = true;
  @Input() fallbackUrl?: string;

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else if (this.fallbackUrl) {
      void this.router.navigateByUrl(this.fallbackUrl);
    }
  }
}
