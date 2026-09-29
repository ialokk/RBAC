export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  socketUrl: 'http://localhost:3000',
  // PUBLIC Razorpay key id only (`rzp_test_...` in development). The key secret and webhook secret
  // are server-side only and must never appear in the Angular bundle — docs/SECURITY.md §5/§8.
  razorpayKeyId: '',
  // PUBLIC Firebase web-app config + Web Push VAPID public key, used only to obtain an FCM
  // registration token. The Firebase Admin service account lives server-side
  // (FIREBASE_SERVICE_ACCOUNT_JSON) and must never appear here. Leave `apiKey` empty to disable
  // push registration entirely — the app then works exactly as it does today, minus push.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    vapidKey: '',
  },
};
