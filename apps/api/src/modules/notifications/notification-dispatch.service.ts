import { DeviceTokenModel } from './device-token.model';
import { NotificationModel, type NotificationHydratedDocument } from './notification.model';
import { UserModel } from '../users/user.model';
import { firebasePushChannel } from './channels/push.channel';
import { httpSmsChannel } from './channels/sms.channel';
import { smtpEmailChannel } from './channels/email.channel';

export interface DispatchInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

// The notification abstraction (docs/ARCHITECTURE.md: "push/SMS/email dispatch, triggered
// directly by domain events") — callers never touch a channel implementation directly, only this
// service. Every attempt is persisted (one `NotificationDocument` per channel actually attempted)
// so delivery history/read-state/retry all have one source of truth, mirroring the
// PaymentGateway/AuditLog "record everything, isolate providers" pattern used elsewhere.
async function sendOnChannel(
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP',
  userId: string,
  type: string,
  payload: Record<string, unknown>,
  attempt: () => Promise<void>,
) {
  const notification = await NotificationModel.create({ userId, channel, type, payload, status: 'QUEUED', attempts: 1 });
  try {
    await attempt();
    notification.status = 'SENT';
  } catch (err) {
    notification.status = 'FAILED';
    notification.failureReason = err instanceof Error ? err.message : 'Unknown error';
  }
  await notification.save();
  return notification;
}

export const notificationDispatchService = {
  // Fans out to every channel the user has reachable contact info/tokens for, plus always an
  // IN_APP record (powers the existing notifications bell/list UI from Phase 3). Best-effort per
  // channel — one channel failing never throws or blocks the others.
  async dispatch(input: DispatchInput): Promise<void> {
    const payload = input.payload ?? {};
    await NotificationModel.create({
      userId: input.userId,
      channel: 'IN_APP',
      type: input.type,
      payload: { title: input.title, body: input.body, ...payload },
      status: 'SENT',
      attempts: 1,
    });

    const user = await UserModel.findById(input.userId);
    if (!user) return;

    const deviceTokens = await DeviceTokenModel.find({ userId: input.userId });
    if (deviceTokens.length > 0) {
      await sendOnChannel('PUSH', input.userId, input.type, payload, () =>
        firebasePushChannel.send({ tokens: deviceTokens.map((t) => t.fcmToken), title: input.title, body: input.body }),
      );
    }

    if (user.mobile) {
      await sendOnChannel('SMS', input.userId, input.type, payload, () =>
        httpSmsChannel.send({ to: user.mobile as string, message: `${input.title}: ${input.body}` }),
      );
    }

    if (user.email) {
      await sendOnChannel('EMAIL', input.userId, input.type, payload, () =>
        smtpEmailChannel.send({ to: user.email as string, subject: input.title, body: input.body }),
      );
    }
  },

  // Sends a single-channel message directly to a target (mobile or email) without needing a User
  // account yet — used for OTP, which fires before/without a resolved user in some flows.
  async sendDirect(channel: 'SMS' | 'EMAIL', target: string, type: string, title: string, body: string): Promise<void> {
    if (channel === 'SMS') {
      await httpSmsChannel.send({ to: target, message: `${title}: ${body}` });
    } else {
      await smtpEmailChannel.send({ to: target, subject: title, body });
    }
  },

  // node-cron retry job (scheduled-jobs) — bounded re-attempts of FAILED sends, never a queue.
  async findRetryableFailedNotifications(maxAttempts: number) {
    return NotificationModel.find({ status: 'FAILED', attempts: { $lt: maxAttempts }, channel: { $ne: 'IN_APP' } }).limit(100);
  },

  async retry(notification: NotificationHydratedDocument): Promise<void> {
    const user = await UserModel.findById(notification.userId);
    if (!user) return;
    try {
      if (notification.channel === 'PUSH') {
        const deviceTokens = await DeviceTokenModel.find({ userId: notification.userId });
        await firebasePushChannel.send({
          tokens: deviceTokens.map((t) => t.fcmToken),
          title: String(notification.payload.title ?? notification.type),
          body: String(notification.payload.body ?? ''),
        });
      } else if (notification.channel === 'SMS' && user.mobile) {
        await httpSmsChannel.send({ to: user.mobile, message: String(notification.payload.body ?? '') });
      } else if (notification.channel === 'EMAIL' && user.email) {
        await smtpEmailChannel.send({ to: user.email, subject: notification.type, body: String(notification.payload.body ?? '') });
      }
      notification.status = 'SENT';
    } catch (err) {
      notification.failureReason = err instanceof Error ? err.message : 'Unknown error';
    }
    notification.attempts += 1;
    await notification.save();
  },
};
