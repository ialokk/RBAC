/* eslint-disable no-undef */
// Background FCM handler for the web/PWA build. Registered separately from ngsw-worker.js with the
// PUBLIC Firebase config appended as query params, so the config stays defined once in
// environments/environment.ts instead of being duplicated here.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'RBAC Food Delivery';
    self.registration.showNotification(title, {
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}
