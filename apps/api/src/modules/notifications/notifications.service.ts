import { HttpError } from '../common/http-error';
import { DeviceTokenModel } from './device-token.model';
import { NotificationModel } from './notification.model';

export const notificationsService = {
  async list(userId: string) {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100);
  },

  async markRead(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOne({ _id: notificationId, userId });
    if (!notification) {
      throw new HttpError(404, 'Notification not found');
    }
    notification.readAt = new Date();
    await notification.save();
    return notification;
  },

  async registerDeviceToken(userId: string, fcmToken: string, platform: 'WEB' | 'ANDROID' | 'IOS') {
    return DeviceTokenModel.findOneAndUpdate(
      { fcmToken },
      { userId, fcmToken, platform, lastSeenAt: new Date() },
      { upsert: true, new: true },
    );
  },
};
