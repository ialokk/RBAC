import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { APP_CONFIG, type FirebaseWebConfig } from '../config/app-config.token';

type Platform = 'WEB' | 'ANDROID' | 'IOS';

function isConfigured(firebase: FirebaseWebConfig): boolean {
  return Boolean(firebase.apiKey && firebase.projectId && firebase.messagingSenderId && firebase.appId);
}

// The single push-notification abstraction for every role — nothing else in the app talks to
// Firebase/Capacitor push or to POST /notifications/device-token. Sending is always server-side;
// this only ever obtains a registration token and hands it to the existing backend contract.
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  // Prevents re-prompting / re-registering on every navigation — registration is attempted once
  // per authenticated session, and again only if the token actually changes.
  private registrationInFlight: Promise<void> | null = null;
  private lastRegisteredToken: string | null = null;

  get isSupportedAndConfigured(): boolean {
    return isConfigured(this.config.firebase);
  }

  private get platform(): Platform {
    if (!Capacitor.isNativePlatform()) return 'WEB';
    return Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID';
  }

  // Called once after the user is authenticated. Never throws: push is an enhancement, so a denied
  // permission, missing config, unsupported browser or network failure must not affect login.
  register(): Promise<void> {
    this.registrationInFlight ??= this.registerOnce().catch(() => undefined);
    return this.registrationInFlight;
  }

  // Call on logout so the next user re-registers their own token rather than inheriting this one.
  reset(): void {
    this.registrationInFlight = null;
    this.lastRegisteredToken = null;
  }

  private async registerOnce(): Promise<void> {
    if (!this.isSupportedAndConfigured) {
      return;
    }
    const token = Capacitor.isNativePlatform() ? await this.getNativeToken() : await this.getWebToken();
    if (token) {
      await this.sendToken(token);
    }
  }

  private async sendToken(fcmToken: string): Promise<void> {
    if (fcmToken === this.lastRegisteredToken) {
      return;
    }
    // Bearer token is attached by the existing auth interceptor.
    await firstValueFrom(
      this.http.post(`${this.config.apiBaseUrl}/notifications/device-token`, { fcmToken, platform: this.platform }),
    );
    this.lastRegisteredToken = fcmToken;
  }

  private async getWebToken(): Promise<string | null> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return null;
    }
    const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
    if (!(await isSupported())) {
      return null;
    }
    // Only ever prompt from the 'default' state — a previous denial is respected and never re-asked.
    if (Notification.permission === 'denied') {
      return null;
    }
    if (Notification.permission === 'default' && (await Notification.requestPermission()) !== 'granted') {
      return null;
    }

    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { vapidKey, ...firebaseOptions } = this.config.firebase;
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseOptions);

    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${new URLSearchParams(firebaseOptions).toString()}`,
    );

    return getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration });
  }

  private async getNativeToken(): Promise<string | null> {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      return null;
    }

    // `registration` fires on the initial registration AND whenever FCM rotates the token, so this
    // listener is also the token-refresh path on native.
    const token = await new Promise<string | null>((resolve) => {
      let settled = false;
      const settle = (value: string | null) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      void PushNotifications.addListener('registration', (result) => {
        void this.sendToken(result.value).catch(() => undefined);
        settle(result.value);
      });
      void PushNotifications.addListener('registrationError', () => settle(null));
      void PushNotifications.register();
    });

    return token;
  }
}
