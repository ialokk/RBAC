import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../../config/env';

export interface EmailChannel {
  send(input: { to: string; subject: string; body: string }): Promise<void>;
}

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  if (!env.SMTP_HOST || !env.SMTP_PORT) return undefined;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export const smtpEmailChannel: EmailChannel = {
  async send({ to, subject, body }) {
    const transport = getTransporter();
    if (!transport) {
      // Foundation/dev mode — no SMTP configured yet.
      // eslint-disable-next-line no-console
      console.log(`[EMAIL] ${to} -> ${subject}: ${body}`);
      return;
    }
    await transport.sendMail({ from: env.SMTP_FROM ?? env.SMTP_USER, to, subject, text: body });
  },
};
