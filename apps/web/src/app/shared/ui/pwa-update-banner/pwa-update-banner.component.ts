import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PwaUpdateService } from '../../../core/pwa/pwa-update.service';

@Component({
  selector: 'app-pwa-update-banner',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (update.updateAvailable$ | async) {
      <div class="pwa-banner" role="status">
        <span>A new version is available.</span>
        <button type="button" (click)="update.activateUpdate()">Refresh</button>
      </div>
    }
  `,
  styles: [
    `
      .pwa-banner {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
        background: var(--app-color-primary, #1a1a1a);
        color: #fff;
        font-size: 0.9rem;
      }
      button {
        background: #fff;
        color: #1a1a1a;
        border: none;
        border-radius: 6px;
        padding: 0.4rem 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }
    `,
  ],
})
export class PwaUpdateBannerComponent implements OnInit {
  readonly update = inject(PwaUpdateService);

  ngOnInit(): void {
    this.update.init();
  }
}
