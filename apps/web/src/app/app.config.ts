import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, effect, inject, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { PushNotificationsService } from './core/notifications/push-notifications.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(AuthService).loadCurrentUser()),
    // Push registration is tied to the auth state, not to navigation — so the permission prompt
    // happens at most once per signed-in session, and never for an anonymous visitor.
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const push = inject(PushNotificationsService);
      effect(() => {
        if (auth.isAuthenticated()) {
          void push.register();
        } else {
          push.reset();
        }
      });
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
