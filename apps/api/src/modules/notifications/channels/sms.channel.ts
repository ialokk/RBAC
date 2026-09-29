import { env } from '../../../config/env';

// No specific SMS vendor is locked in the docs (docs/ARCHITECTURE.md just says "SMS OTP
// Provider") — this generic HTTP contract ({to, message} POST with a bearer key) works with most
// REST-based SMS gateways; swapping providers means only touching this file.
export interface SmsChannel {
  send(input: { to: string; message: string }): Promise<void>;
}

export const httpSmsChannel: SmsChannel = {
  async send({ to, message }) {
    if (!env.SMS_PROVIDER_API_URL) {
      // Foundation/dev mode — no provider configured yet.
      // eslint-disable-next-line no-console
      console.log(`[SMS] ${to} -> ${message}`);
      return;
    }
    const response = await fetch(env.SMS_PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.SMS_PROVIDER_API_KEY ? { Authorization: `Bearer ${env.SMS_PROVIDER_API_KEY}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });
    if (!response.ok) {
      throw new Error(`SMS provider responded with status ${response.status}`);
    }
  },
};
