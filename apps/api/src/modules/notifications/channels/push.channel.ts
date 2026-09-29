import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../../../config/env';

// Provider-specific code isolated behind this interface (same pattern as PaymentGateway,
// docs/SECURITY.md §5) — the rest of the app only ever calls `pushChannel.send(...)`.
export interface PushChannel {
  send(input: { tokens: string[]; title: string; body: string; data?: Record<string, string> }): Promise<void>;
}

let firebaseApp: App | undefined;

function getFirebaseApp(): App | undefined {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return undefined;
  if (firebaseApp) return firebaseApp;
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  firebaseApp = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
  return firebaseApp;
}

export const firebasePushChannel: PushChannel = {
  async send({ tokens, title, body, data }) {
    if (tokens.length === 0) return;
    const app = getFirebaseApp();
    if (!app) {
      // Foundation/dev mode — no service account configured yet.
      // eslint-disable-next-line no-console
      console.log(`[PUSH] ${tokens.join(',')} -> ${title}: ${body}`);
      return;
    }
    await getMessaging(app).sendEachForMulticast({ tokens, notification: { title, body }, data });
  },
};
