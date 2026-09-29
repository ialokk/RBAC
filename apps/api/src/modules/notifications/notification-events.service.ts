import { OrderStatus } from '@rbac/shared-types';
import { UserModel } from '../users/user.model';
import type { OrderDocument } from '../orders/order.model';
import { notificationDispatchService } from './notification-dispatch.service';

type OrderForNotification = Pick<OrderDocument, 'status' | 'customerId' | 'restaurantId'> & { id?: string };

const ORDER_EVENTS: Partial<Record<OrderStatus, { type: string; title: string; body: string }>> = {
  [OrderStatus.RESTAURANT_PENDING]: {
    type: 'ORDER_PLACED',
    title: 'Order placed',
    body: 'Your order has been placed and sent to the restaurant.',
  },
  [OrderStatus.RESTAURANT_ACCEPTED]: {
    type: 'RESTAURANT_ACCEPTED',
    title: 'Order accepted',
    body: 'The restaurant has accepted your order.',
  },
  [OrderStatus.RESTAURANT_REJECTED]: {
    type: 'RESTAURANT_REJECTED',
    title: 'Order rejected',
    body: 'The restaurant was unable to accept your order. A refund will be processed.',
  },
  [OrderStatus.PREPARING]: {
    type: 'ORDER_PREPARING',
    title: 'Preparing your order',
    body: 'The restaurant has started preparing your food.',
  },
  [OrderStatus.READY_FOR_PICKUP]: {
    type: 'ORDER_READY',
    title: 'Order ready',
    body: 'Your order is ready and awaiting pickup by a delivery partner.',
  },
  [OrderStatus.DELIVERY_ASSIGNED]: {
    type: 'DELIVERY_ASSIGNED',
    title: 'Delivery partner assigned',
    body: 'A delivery partner has been assigned to your order.',
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    type: 'OUT_FOR_DELIVERY',
    title: 'Out for delivery',
    body: 'Your order is on its way.',
  },
  [OrderStatus.DELIVERED]: {
    type: 'ORDER_DELIVERED',
    title: 'Order delivered',
    body: 'Your order has been delivered. Enjoy your meal!',
  },
  [OrderStatus.DELIVERY_CANCELLED]: {
    type: 'DELIVERY_ASSIGNMENT_FAILED',
    title: 'Order cancelled',
    body: "Unfortunately, we couldn't find a delivery partner for your order, so the order has been cancelled.",
  },
  [OrderStatus.PAYMENT_FAILED]: {
    type: 'PAYMENT_FAILED',
    title: 'Payment failed',
    body: 'Your payment could not be completed. Please try again.',
  },
  [OrderStatus.REFUNDED]: {
    type: 'REFUND_PROCESSED',
    title: 'Refund processed',
    body: 'Your refund has been processed by the payment gateway.',
  },
};

// Event triggers (docs/ARCHITECTURE.md: "push/SMS/email dispatch, triggered directly by domain
// events") — called directly from orders.service.ts right after every order status change, mirroring
// the same call site used for `emitOrderStatusChanged` (Phase 8). Never throws: a notification
// failure must not break the order flow it's reporting on.
export const notificationEventsService = {
  async notifyOrderStatusChange(order: OrderForNotification): Promise<void> {
    const orderId = order.id ?? '';
    const event = ORDER_EVENTS[order.status];
    if (event) {
      try {
        await notificationDispatchService.dispatch({
          userId: order.customerId.toString(),
          type: event.type,
          title: event.title,
          body: event.body,
          payload: { orderId, status: order.status },
        });
      } catch {
        // best-effort — never block the order flow on a notification failure
      }
    }

    if (order.status === OrderStatus.RESTAURANT_PENDING) {
      const owner = await UserModel.findOne({ restaurantId: order.restaurantId });
      if (owner) {
        try {
          await notificationDispatchService.dispatch({
            userId: owner.id,
            type: 'ORDER_INCOMING',
            title: 'New order received',
            body: 'A new order is awaiting your response.',
            payload: { orderId },
          });
        } catch {
          // best-effort
        }
      }
    }

    // The restaurant is still holding prepared food for a pickup that will never happen, so it
    // needs its own explicit notification rather than only seeing the status flip.
    if (order.status === OrderStatus.DELIVERY_CANCELLED) {
      const owner = await UserModel.findOne({ restaurantId: order.restaurantId });
      if (owner) {
        try {
          await notificationDispatchService.dispatch({
            userId: owner.id,
            type: 'ORDER_CANCELLED_NO_DELIVERY_PARTNER',
            title: 'Order cancelled',
            body: `Order #${orderId} was cancelled because a delivery partner could not be assigned.`,
            payload: { orderId },
          });
        } catch {
          // best-effort
        }
      }
    }
  },
};
