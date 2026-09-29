import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PwaInstallService } from '../../../core/pwa/pwa-install.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (install.canInstall$ | async) {
      <div class="pwa-banner" role="status">
        <span>Install this app for a faster, full-screen experience.</span>
        <button type="button" (click)="install.promptInstall()">Install</button>
        <button type="button" class="dismiss" (click)="dismiss()" aria-label="Dismiss">✕</button>
      </div>
    }
  `,
  styles: [
    `
      .pwa-banner {
        position: fixed;
        left: 0;
        right: 0;
        top: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.6rem 1rem;
        padding-top: calc(0.6rem + env(safe-area-inset-top));
        background: var(--app-color-surface, #f2f2f2);
        color: #1a1a1a;
        font-size: 0.85rem;
      }
      button {
        border: none;
        border-radius: 6px;
        padding: 0.35rem 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }
      button:not(.dismiss) {
        background: var(--app-color-primary, #1a1a1a);
        color: #fff;
      }
      .dismiss {
        background: transparent;
        color: inherit;
        padding: 0.35rem 0.5rem;
      }
    `,
  ],
})
export class PwaInstallBannerComponent implements OnInit {
  readonly install = inject(PwaInstallService);
  dismissed = false;

  ngOnInit(): void {
    this.install.init();
  }

  dismiss(): void {
    this.install.canInstall$.next(false);
  }
}
