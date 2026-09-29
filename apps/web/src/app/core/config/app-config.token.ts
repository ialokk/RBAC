import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  socketUrl: string;
  razorpayKeyId: string;
  firebase: FirebaseWebConfig;
}

// App-wide config token — populated from the environment, never hard-coded per feature.
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  factory: () => ({
    apiBaseUrl: environment.apiBaseUrl,
    socketUrl: environment.socketUrl,
    razorpayKeyId: environment.razorpayKeyId,
    firebase: environment.firebase,
  }),
});
