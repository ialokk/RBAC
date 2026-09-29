import { notificationDispatchService } from '../notifications/notification-dispatch.service';

// Delivery abstraction — auth business logic only ever calls `otpSender.send(...)`, never a
// channel implementation directly. Routes through the same push/SMS/email abstraction every other
// domain event uses (Phase 10), so OTP delivery gets identical provider isolation + history.
export interface OtpSender {
  send(target: string, channel: 'SMS' | 'EMAIL', code: string): Promise<void>;
}

export class DefaultOtpSender implements OtpSender {
  async send(target: string, channel: 'SMS' | 'EMAIL', code: string): Promise<void> {
    await notificationDispatchService.sendDirect(
      channel,
      target,
      'OTP',
      'Your verification code',
      `Your OTP is ${code}. It expires in 5 minutes.`,
    );
  }
}

export const otpSender: OtpSender = new DefaultOtpSender();
