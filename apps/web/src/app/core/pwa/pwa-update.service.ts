import { Injectable, NgZone, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — SwUpdate already re-checks on navigation/reconnect.

// Wraps SwUpdate: surfaces "an update is ready" as a signal-like observable the update banner
// subscribes to, and owns the actual reload/activate flow so it only ever happens once, on demand.
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly zone = inject(NgZone);

  readonly updateAvailable$ = new BehaviorSubject(false);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.zone.run(() => this.updateAvailable$.next(true));
      }
    });

    // A corrupted install (e.g. a cached asset 404s) can't self-heal — force a clean reload.
    this.swUpdate.unrecoverable.subscribe(() => {
      this.zone.run(() => window.location.reload());
    });

    setInterval(() => {
      void this.swUpdate.checkForUpdate();
    }, CHECK_INTERVAL_MS);
  }

  async activateUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    window.location.reload();
  }
}
