export const environment = {
  production: true,
  apiBaseUrl: 'https://api.example.com/api/v1',
  socketUrl: 'https://api.example.com',
  // PUBLIC Razorpay key id only (`rzp_live_...`). Never the key secret or webhook secret.
  razorpayKeyId: '',
  // PUBLIC Firebase web-app config + Web Push VAPID public key only. The Firebase Admin service
  // account is server-side (FIREBASE_SERVICE_ACCOUNT_JSON) and must never appear here.
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
