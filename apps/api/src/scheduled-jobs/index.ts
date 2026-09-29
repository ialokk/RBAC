import cron from 'node-cron';
import { env } from '../config/env';
import { deliveryAssignmentsService } from '../modules/delivery/delivery-assignments.service';
import { ordersService } from '../modules/orders/orders.service';
import { notificationDispatchService } from '../modules/notifications/notification-dispatch.service';

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

// Order-engine timeout safeguards (docs/ORDER-STATE-MACHINE.md §5) — MongoDB TTL indexes handle
// OTP/session expiry elsewhere; these three run every minute against MongoDB directly, no queue.
async function runOrderTimeoutChecks(): Promise<void> {
  const staleRestaurantPending = await ordersService.findStaleRestaurantPendingOrders(
    minutesAgo(env.RESTAURANT_ACCEPT_SLA_MINUTES),
  );
  for (const order of staleRestaurantPending) {
    await ordersService.autoRejectStaleOrder(order.id);
  }

  // Nobody accepted the offers that were made in time — run the next assignment round.
  const staleDeliveryAssigned = await ordersService.findStaleDeliveryAssignedOrders(
    minutesAgo(env.DELIVERY_ACCEPT_SLA_MINUTES),
  );
  for (const order of staleDeliveryAssigned) {
    await deliveryAssignmentsService.reassign(order.id);
  }

  // Food is ready but no eligible partner was matched at all, so the order never reached
  // DELIVERY_ASSIGNED and the check above can't see it. Retry the match each SLA window; once
  // MAX_DELIVERY_REASSIGN_ATTEMPTS rounds are exhausted the order is auto-cancelled rather than
  // left stuck at READY_FOR_PICKUP forever (docs/ORDER-STATE-MACHINE.md §6).
  const awaitingAssignment = await ordersService.findOrdersAwaitingDeliveryAssignment(
    minutesAgo(env.DELIVERY_ACCEPT_SLA_MINUTES),
  );
  for (const order of awaitingAssignment) {
    await deliveryAssignmentsService.runAssignmentRound(order.id);
  }

  const stalePaymentPending = await ordersService.findStalePaymentPendingOrders(
    minutesAgo(env.PAYMENT_PENDING_SLA_MINUTES),
  );
  for (const order of stalePaymentPending) {
    await ordersService.markPaymentFailed(order.id);
  }
}

export function registerScheduledJobs(): void {
  cron.schedule('* * * * *', () => {
    runOrderTimeoutChecks().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[scheduled-jobs] order timeout check failed', err);
    });
  });

  // Bounded retry of FAILED push/SMS/email sends (docs/ARCHITECTURE.md §5: scheduled jobs replace a
  // retry queue) — IN_APP records are never retried since they don't call an external provider.
  cron.schedule('*/5 * * * *', () => {
    notificationDispatchService
      .findRetryableFailedNotifications(env.NOTIFICATION_MAX_RETRY_ATTEMPTS)
      .then((notifications) => Promise.all(notifications.map((n) => notificationDispatchService.retry(n))))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[scheduled-jobs] notification retry failed', err);
      });
  });
}
