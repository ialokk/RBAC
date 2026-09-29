import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Chrome/Edge suppress their automatic "install app" mini-infobar once `beforeinstallprompt` is
// preventDefault()'d — this captures that deferred event so a custom "Add to Home Screen" banner
// can trigger it on demand instead (standard installability pattern, no native-only APIs).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly zone = inject(NgZone);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall$ = new BehaviorSubject(false);

  init(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.zone.run(() => this.canInstall$.next(true));
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.zone.run(() => this.canInstall$.next(false));
    });
  }

  async promptInstall(): Promise<void> {
    if (!this.deferredPrompt) return;
    await this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall$.next(false);
  }
}
