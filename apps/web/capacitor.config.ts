import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rbac.fooddelivery',
  appName: 'Food Delivery',
  webDir: 'dist/web/browser',
  backgroundColor: '#1a1a1a',
  server: {
    // https (not the default capacitor:// scheme) so cookies/secure-context APIs (geolocation,
    // service worker registration) behave the same as the deployed web origin.
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    // Only enable the WebView remote-debugging bridge in local/dev builds, never production.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
