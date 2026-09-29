import { OrderStatus, UserRole } from '@rbac/shared-types';
import type { Schema } from 'mongoose';
import { HttpError } from '../common/http-error';
import { computePricing } from '../common/pricing.util';
import { auditLogService } from '../common/audit-log.service';
import { AddressModel } from '../addresses/address.model';
import { CartModel } from '../carts/cart.model';
import { couponsService } from '../coupons/coupons.service';
import { MenuItemModel } from '../menu/menu-item.model';
import { restaurantsService } from '../restaurants/restaurants.service';
import { emitOrderStatusChanged } from '../../sockets/realtime-events.service';
import { notificationEventsService } from '../notifications/notification-events.service';
import { OrderModel, type OrderDocument, type OrderStatusHistoryEntry } from './order.model';

// Canonical, single source of truth for order transitions — mirrors the main-flow + alternate-flow
// diagram in docs/ORDER-STATE-MACHINE.md §2 exactly. Every status change in this module (payment,
// restaurant workflow, delivery workflow, cancellation, refund) goes through `assertTransition`
// below; nothing bypasses this allow-list, per docs/ORDER-STATE-MACHINE.md §1/§4.
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CUSTOMER_CANCELLED],
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CUSTOMER_CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.RESTAURANT_PENDING],
  [OrderStatus.RESTAURANT_PENDING]: [OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.RESTAURANT_REJECTED, OrderStatus.CUSTOMER_CANCELLED],
  [OrderStatus.RESTAURANT_ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CUSTOMER_CANCELLED, OrderStatus.RESTAURANT_CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.RESTAURANT_CANCELLED],
  // DELIVERY_CANCELLED is also reachable directly from READY_FOR_PICKUP: when no eligible partner
  // can be matched at all, the order never reaches DELIVERY_ASSIGNED, so the exhausted-retry
  // cancellation has to start from here (docs/ORDER-STATE-MACHINE.md §6).
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERY_ASSIGNED, OrderStatus.DELIVERY_CANCELLED],
  [OrderStatus.DELIVERY_ASSIGNED]: [OrderStatus.DELIVERY_ACCEPTED, OrderStatus.DELIVERY_ASSIGNED, OrderStatus.DELIVERY_CANCELLED],
  [OrderStatus.DELIVERY_ACCEPTED]: [OrderStatus.PICKED_UP, OrderStatus.DELIVERY_CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.PAYMENT_FAILED]: [],
  [OrderStatus.RESTAURANT_REJECTED]: [OrderStatus.REFUND_PENDING],
  [OrderStatus.CUSTOMER_CANCELLED]: [OrderStatus.REFUND_PENDING],
  [OrderStatus.RESTAURANT_CANCELLED]: [OrderStatus.REFUND_PENDING],
  // Retry with a new partner while attempts remain; REFUND_PENDING is the terminal exit once the
  // configured assignment rounds are exhausted (an order must never rest in DELIVERY_CANCELLED).
  [OrderStatus.DELIVERY_CANCELLED]: [OrderStatus.DELIVERY_ASSIGNED, OrderStatus.REFUND_PENDING],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

// `CUSTOMER_CANCELLED` is only reachable from these states — matches the diagram (no edge exists
// from PREPARING onward), i.e. "blocked once PREPARING" per docs/ORDER-STATE-MACHINE.md §4.
const CANCELLABLE_BY_CUSTOMER: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.RESTAURANT_PENDING,
  OrderStatus.RESTAURANT_ACCEPTED,
];

// Admin exception cancellation is allowed up to (and including) PREPARING — beyond that the food
// is already out of the kitchen/with a delivery partner and cannot be safely unwound in Version 1.
const CANCELLABLE_BY_ADMIN: OrderStatus[] = [...CANCELLABLE_BY_CUSTOMER, OrderStatus.PREPARING];

const INACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CUSTOMER_CANCELLED,
  OrderStatus.RESTAURANT_CANCELLED,
  OrderStatus.DELIVERY_CANCELLED,
  OrderStatus.RESTAURANT_REJECTED,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.REFUND_PENDING,
  OrderStatus.REFUNDED,
];

export function pushHistory(
  order: OrderDocument,
  status: OrderStatus,
  actorRole: UserRole | 'SYSTEM',
  actorId?: string,
  reason?: string,
): void {
  order.status = status;
  order.statusHistory.push({
    status,
    at: new Date(),
    actorRole,
    actorId: actorId as unknown as OrderStatusHistoryEntry['actorId'],
    reason,
  });
}

function assertTransition(order: OrderDocument, to: OrderStatus): void {
  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(to)) {
    throw new HttpError(409, `Cannot move order from ${order.status} to ${to}`);
  }
}

// Ownership per docs/ROLE-PERMISSIONS.md §4 — a delivery partner may only act on the order they
// are actually assigned to.
function assertAssignedPartner(order: OrderDocument, partnerId: string): void {
  if (!order.assignedDeliveryPartnerId || order.assignedDeliveryPartnerId.toString() !== partnerId) {
    throw new HttpError(403, 'You are not assigned to this order');
  }
}

export interface CreateOrderInput {
  addressId: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'COD';
}


export const ordersService = {
  async createFromCart(userId: string, input: CreateOrderInput) {
    const cart = await CartModel.findOne({ userId });
    if (!cart || cart.items.length === 0 || !cart.restaurantId) {
      throw new HttpError(400, 'Cart is empty');
    }

    const address = await AddressModel.findOne({ _id: input.addressId, userId });
    if (!address) {
      throw new HttpError(404, 'Delivery address not found');
    }

    // Re-validate items are still available at checkout time (per docs/API-SPEC.md §9).
    for (const item of cart.items) {
      const menuItem = await MenuItemModel.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        throw new HttpError(400, `"${item.name}" is no longer available — please update your cart`);
      }
    }

    const itemsTotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    let discount = 0;
    if (cart.couponCode) {
      const evaluation = await couponsService.validateAndCompute(cart.couponCode, userId, cart.restaurantId.toString(), itemsTotal);
      discount = evaluation.discount;
    }
    const pricing = await computePricing(itemsTotal, discount);

    const order = new OrderModel({
      customerId: userId,
      restaurantId: cart.restaurantId,
      items: cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        nameSnapshot: item.name,
        priceSnapshot: item.price,
        qty: item.qty,
        variationSnapshot: item.selectedVariation,
        addonsSnapshot: item.selectedAddons,
        instructions: item.instructions,
      })),
      deliveryAddressSnapshot: {
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      pricing,
      couponCode: cart.couponCode,
      paymentMethod: input.paymentMethod,
      status: OrderStatus.CREATED,
      statusHistory: [],
    });

    pushHistory(order, OrderStatus.CREATED, UserRole.CUSTOMER, userId);
    pushHistory(order, OrderStatus.PAYMENT_PENDING, UserRole.CUSTOMER, userId);

    if (input.paymentMethod === 'COD') {
      // COD confirms payment immediately (no gateway involved) and moves straight to the
      // restaurant. Still walks through every edge in the graph (CREATED -> PAYMENT_PENDING ->
      // PAID -> ...) so COD isn't a special-cased shortcut around the state machine.
      pushHistory(order, OrderStatus.PAID, 'SYSTEM', undefined, 'COD confirmed at order placement');
      pushHistory(order, OrderStatus.RESTAURANT_PENDING, 'SYSTEM');
    }
    // Online methods (UPI/CARD/NETBANKING) stay at PAYMENT_PENDING — the router composes with
    // paymentsService (Phase 7) to create the gateway order right after this save, mirroring the
    // orders/delivery composition pattern from Phase 5/6 (orders.service never imports payments).

    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);

    cart.items.splice(0, cart.items.length);
    cart.restaurantId = undefined;
    cart.couponCode = undefined;
    await cart.save();

    return order;
  },

  async list(userId: string, page: number, limit: number) {
    const filter = { customerId: userId };
    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  // ADMIN — all orders, optionally filtered by status (docs/API-SPEC.md §10: "ADMIN (all + filters)").
  async listAll(page: number, limit: number, status?: string) {
    const filter: Record<string, unknown> = status ? { status } : {};
    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getByIdAdmin(orderId: string) {
    return this.findById(orderId);
  },

  async current(userId: string) {
    return OrderModel.findOne({ customerId: userId, status: { $nin: INACTIVE_STATUSES } }).sort({ createdAt: -1 });
  },

  async getByIdForCustomer(userId: string, orderId: string) {
    const order = await OrderModel.findOne({ _id: orderId, customerId: userId });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    return order;
  },

  async cancel(userId: string, orderId: string, reason: string) {
    const order = await this.getByIdForCustomer(userId, orderId);
    if (!CANCELLABLE_BY_CUSTOMER.includes(order.status)) {
      throw new HttpError(409, `Order cannot be cancelled once it is ${order.status}`);
    }
    // Only RESTAURANT_PENDING/RESTAURANT_ACCEPTED had already reached PAID before cancellation —
    // CREATED/PAYMENT_PENDING never collected payment, so nothing is owed back.
    const hadPayment = [OrderStatus.RESTAURANT_PENDING, OrderStatus.RESTAURANT_ACCEPTED].includes(order.status);
    assertTransition(order, OrderStatus.CUSTOMER_CANCELLED);
    pushHistory(order, OrderStatus.CUSTOMER_CANCELLED, UserRole.CUSTOMER, userId, reason);
    order.cancellation = { cancelledBy: userId as unknown as Schema.Types.ObjectId, reason, at: new Date() };
    if (hadPayment) {
      pushHistory(order, OrderStatus.REFUND_PENDING, 'SYSTEM', undefined, 'Auto: refund owed after customer cancellation');
    }
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  // ADMIN — cancel any order up to (and including) PREPARING. Bypasses ownership, so every call is
  // written to the audit trail per docs/ROLE-PERMISSIONS.md §4.
  async cancelByAdmin(adminUserId: string, orderId: string, reason: string) {
    const order = await this.findById(orderId);
    if (!CANCELLABLE_BY_ADMIN.includes(order.status)) {
      throw new HttpError(409, `Order cannot be cancelled once it is ${order.status}`);
    }
    const hadPayment = ![OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING].includes(order.status);
    const targetStatus = CANCELLABLE_BY_CUSTOMER.includes(order.status)
      ? OrderStatus.CUSTOMER_CANCELLED
      : OrderStatus.RESTAURANT_CANCELLED;
    assertTransition(order, targetStatus);
    pushHistory(order, targetStatus, UserRole.ADMIN, adminUserId, reason);
    order.cancellation = { cancelledBy: adminUserId as unknown as Schema.Types.ObjectId, reason, at: new Date() };
    if (hadPayment) {
      pushHistory(order, OrderStatus.REFUND_PENDING, 'SYSTEM', undefined, 'Auto: refund owed after admin cancellation');
    }
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);

    await auditLogService.record({
      actorUserId: adminUserId,
      action: 'ORDER_CANCEL_ADMIN',
      targetType: 'order',
      targetId: orderId,
      metadata: { reason, resultingStatus: targetStatus },
    });

    return order;
  },

  // System-only — payment verification/webhooks (Phase 7) and the payment-timeout scheduled job
  // are the only callers; never settable directly by a client request. Chains straight through to
  // RESTAURANT_PENDING (same PAID -> RESTAURANT_PENDING edge the COD path in createFromCart walks
  // inline) — an online-paid order must become visible to the restaurant exactly like a COD order
  // does, never stall at PAID (post-Phase-13 integration fix; see TASKS.md).
  async markPaid(orderId: string) {
    const order = await this.findById(orderId);
    assertTransition(order, OrderStatus.PAID);
    pushHistory(order, OrderStatus.PAID, 'SYSTEM');
    assertTransition(order, OrderStatus.RESTAURANT_PENDING);
    pushHistory(order, OrderStatus.RESTAURANT_PENDING, 'SYSTEM');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async markPaymentFailed(orderId: string) {
    const order = await this.findById(orderId);
    assertTransition(order, OrderStatus.PAYMENT_FAILED);
    pushHistory(order, OrderStatus.PAYMENT_FAILED, 'SYSTEM');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  // System-only — set once the Payments module (Phase 7) confirms a refund with the gateway.
  async markRefunded(orderId: string) {
    const order = await this.findById(orderId);
    assertTransition(order, OrderStatus.REFUNDED);
    pushHistory(order, OrderStatus.REFUNDED, 'SYSTEM');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async reorder(userId: string, orderId: string) {
    const order = await this.getByIdForCustomer(userId, orderId);
    const cart = (await CartModel.findOne({ userId })) ?? (await CartModel.create({ userId, items: [] }));

    cart.items.splice(0, cart.items.length);
    cart.restaurantId = order.restaurantId;
    cart.couponCode = undefined;

    const skippedItems: string[] = [];
    for (const item of order.items) {
      const menuItem = await MenuItemModel.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        skippedItems.push(item.nameSnapshot);
        continue;
      }
      cart.items.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        qty: item.qty,
        selectedVariation: item.variationSnapshot,
        selectedAddons: item.addonsSnapshot,
        instructions: item.instructions,
      });
    }

    if (cart.items.length === 0) {
      cart.restaurantId = undefined;
    }
    await cart.save();
    return { cart, skippedItems };
  },

  // --- Restaurant-facing order workflow (Phase 4) ---

  async listForRestaurant(restaurantUserId: string, page: number, limit: number, status?: string) {
    const restaurant = await restaurantsService.getOwnRestaurantOrThrow(restaurantUserId);
    const filter: Record<string, unknown> = { restaurantId: restaurant.id };
    if (status) {
      filter.status = status;
    }
    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getByIdForRestaurant(restaurantUserId: string, orderId: string) {
    const restaurant = await restaurantsService.getOwnRestaurantOrThrow(restaurantUserId);
    const order = await OrderModel.findOne({ _id: orderId, restaurantId: restaurant.id });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    return order;
  },

  async acceptOrder(restaurantUserId: string, orderId: string) {
    const order = await this.getByIdForRestaurant(restaurantUserId, orderId);
    assertTransition(order, OrderStatus.RESTAURANT_ACCEPTED);
    pushHistory(order, OrderStatus.RESTAURANT_ACCEPTED, UserRole.RESTAURANT, restaurantUserId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async rejectOrder(restaurantUserId: string, orderId: string, reason: string) {
    const order = await this.getByIdForRestaurant(restaurantUserId, orderId);
    assertTransition(order, OrderStatus.RESTAURANT_REJECTED);
    pushHistory(order, OrderStatus.RESTAURANT_REJECTED, UserRole.RESTAURANT, restaurantUserId, reason);
    order.rejection = { reason, at: new Date() };
    // COD orders are already PAID by the time they reach the restaurant (Phase 3 baseline) —
    // a rejection therefore owes the customer a refund. Actual gateway refund is Phase 7; this
    // only records that one is owed, per docs/ORDER-STATE-MACHINE.md (RESTAURANT_REJECTED -> REFUND_PENDING).
    pushHistory(order, OrderStatus.REFUND_PENDING, UserRole.RESTAURANT, restaurantUserId, 'Auto: refund owed after restaurant rejection');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async setPrepTime(restaurantUserId: string, orderId: string, prepTimeMinutes: number) {
    const order = await this.getByIdForRestaurant(restaurantUserId, orderId);
    if (![OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.PREPARING].includes(order.status)) {
      throw new HttpError(409, `Cannot set preparation time while order is ${order.status}`);
    }
    order.prepTimeMinutes = prepTimeMinutes;
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  // --- Order-engine timeout safeguards (Phase 6, docs/ORDER-STATE-MACHINE.md §5) ---
  // Invoked only by apps/api/src/scheduled-jobs (node-cron), never by a client request.

  async findStaleRestaurantPendingOrders(olderThan: Date) {
    return OrderModel.find({
      status: OrderStatus.RESTAURANT_PENDING,
      updatedAt: { $lt: olderThan },
    });
  },

  async autoRejectStaleOrder(orderId: string) {
    const order = await this.findById(orderId);
    if (order.status !== OrderStatus.RESTAURANT_PENDING) {
      return order;
    }
    assertTransition(order, OrderStatus.RESTAURANT_REJECTED);
    const reason = 'Auto-rejected: restaurant did not respond within the SLA window';
    pushHistory(order, OrderStatus.RESTAURANT_REJECTED, 'SYSTEM', undefined, reason);
    order.rejection = { reason, at: new Date() };
    pushHistory(order, OrderStatus.REFUND_PENDING, 'SYSTEM', undefined, 'Auto: refund owed after SLA auto-rejection');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async findStalePaymentPendingOrders(olderThan: Date) {
    return OrderModel.find({
      status: OrderStatus.PAYMENT_PENDING,
      updatedAt: { $lt: olderThan },
    });
  },

  async findStaleDeliveryAssignedOrders(olderThan: Date) {
    return OrderModel.find({
      status: OrderStatus.DELIVERY_ASSIGNED,
      updatedAt: { $lt: olderThan },
    });
  },

  // Orders whose food is ready but which never reached DELIVERY_ASSIGNED because zero eligible
  // partners were matched — without this the order would sit at READY_FOR_PICKUP forever, since
  // findStaleDeliveryAssignedOrders only ever sees orders that DID get offered to someone.
  async findOrdersAwaitingDeliveryAssignment(olderThan: Date) {
    return OrderModel.find({
      status: OrderStatus.READY_FOR_PICKUP,
      updatedAt: { $lt: olderThan },
    });
  },

  // One partner-matching ROUND. Atomic $inc so a slow round can never be double-counted, and so the
  // count reflects rounds rather than the number of offers a single round happened to create.
  async recordDeliveryAssignmentAttempt(orderId: string): Promise<number> {
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      { $inc: { deliveryAssignmentAttempts: 1 } },
      { new: true },
    );
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    return order.deliveryAssignmentAttempts;
  },

  // Terminal exit when every configured assignment round has failed (docs/ORDER-STATE-MACHINE.md
  // §6). Idempotent: a later cron tick finds the order already past these states and no-ops, so the
  // same order is never cancelled — or refunded — twice.
  async cancelForNoDeliveryPartner(orderId: string, attempts: number) {
    const order = await this.findById(orderId);
    if (order.status !== OrderStatus.READY_FOR_PICKUP && order.status !== OrderStatus.DELIVERY_ASSIGNED) {
      return { order, cancelled: false };
    }

    const reason = 'Auto-cancelled: no delivery partner could be assigned';
    assertTransition(order, OrderStatus.DELIVERY_CANCELLED);
    pushHistory(order, OrderStatus.DELIVERY_CANCELLED, 'SYSTEM', undefined, reason);
    order.cancellation = { reason, at: new Date() };
    // The order was already PAID (COD is confirmed at placement, online is confirmed before the
    // restaurant ever sees it), so money is always owed back — paymentsService.refund() decides
    // gateway-refund vs COD cash-record, exactly as it does for admin/restaurant cancellations.
    pushHistory(order, OrderStatus.REFUND_PENDING, 'SYSTEM', undefined, 'Auto: refund owed after delivery-assignment failure');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);

    await auditLogService.record({
      action: 'ORDER_AUTO_CANCELLED_NO_DELIVERY_PARTNER',
      targetType: 'order',
      targetId: orderId,
      metadata: { deliveryAssignmentAttempts: attempts, reason },
    });

    return { order, cancelled: true };
  },

  async markPreparing(restaurantUserId: string, orderId: string) {
    const order = await this.getByIdForRestaurant(restaurantUserId, orderId);
    assertTransition(order, OrderStatus.PREPARING);
    pushHistory(order, OrderStatus.PREPARING, UserRole.RESTAURANT, restaurantUserId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async markReady(restaurantUserId: string, orderId: string) {
    const order = await this.getByIdForRestaurant(restaurantUserId, orderId);
    assertTransition(order, OrderStatus.READY_FOR_PICKUP);
    pushHistory(order, OrderStatus.READY_FOR_PICKUP, UserRole.RESTAURANT, restaurantUserId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async dashboardSummary(restaurantUserId: string) {
    const restaurant = await restaurantsService.getOwnRestaurantOrThrow(restaurantUserId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [statusCounts, todayOrders] = await Promise.all([
      OrderModel.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: { restaurantId: restaurant._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      OrderModel.find({ restaurantId: restaurant._id, createdAt: { $gte: startOfToday } }),
    ]);

    const countByStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count])) as Record<string, number>;
    const revenueStatuses: OrderStatus[] = [
      OrderStatus.RESTAURANT_ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.DELIVERY_ASSIGNED,
      OrderStatus.DELIVERY_ACCEPTED,
      OrderStatus.PICKED_UP,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];
    const todayRevenue = todayOrders
      .filter((o) => revenueStatuses.includes(o.status))
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    return {
      today: {
        totalOrders: todayOrders.length,
        revenue: todayRevenue,
      },
      pending: countByStatus[OrderStatus.RESTAURANT_PENDING] ?? 0,
      accepted: countByStatus[OrderStatus.RESTAURANT_ACCEPTED] ?? 0,
      preparing: countByStatus[OrderStatus.PREPARING] ?? 0,
      ready: countByStatus[OrderStatus.READY_FOR_PICKUP] ?? 0,
      completed: countByStatus[OrderStatus.DELIVERED] ?? 0,
      cancelled:
        (countByStatus[OrderStatus.RESTAURANT_CANCELLED] ?? 0) +
        (countByStatus[OrderStatus.RESTAURANT_REJECTED] ?? 0) +
        (countByStatus[OrderStatus.CUSTOMER_CANCELLED] ?? 0),
    };
  },

  // --- Delivery-facing order transitions (Phase 5) ---
  // Assignment-document lifecycle (OFFERED/ACCEPTED/DECLINED/...) lives in modules/delivery;
  // this module remains the sole authority for the order's own status per docs/ORDER-STATE-MACHINE.md §1.

  async findById(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    return order;
  },

  // System (assignment engine baseline) offers the order out for delivery once it's ready.
  async markDeliveryAssigned(orderId: string) {
    const order = await this.findById(orderId);
    assertTransition(order, OrderStatus.DELIVERY_ASSIGNED);
    pushHistory(order, OrderStatus.DELIVERY_ASSIGNED, 'SYSTEM');
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async assignDeliveryPartner(orderId: string, partnerId: string) {
    const order = await this.findById(orderId);
    assertTransition(order, OrderStatus.DELIVERY_ACCEPTED);
    order.assignedDeliveryPartnerId = partnerId as unknown as OrderDocument['assignedDeliveryPartnerId'];
    pushHistory(order, OrderStatus.DELIVERY_ACCEPTED, UserRole.DELIVERY_PARTNER, partnerId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async markPickedUpForDelivery(orderId: string, partnerId: string) {
    const order = await this.findById(orderId);
    assertAssignedPartner(order, partnerId);
    assertTransition(order, OrderStatus.PICKED_UP);
    pushHistory(order, OrderStatus.PICKED_UP, UserRole.DELIVERY_PARTNER, partnerId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async markOutForDelivery(orderId: string, partnerId: string) {
    const order = await this.findById(orderId);
    assertAssignedPartner(order, partnerId);
    assertTransition(order, OrderStatus.OUT_FOR_DELIVERY);
    pushHistory(order, OrderStatus.OUT_FOR_DELIVERY, UserRole.DELIVERY_PARTNER, partnerId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },

  async markDeliveredForDelivery(orderId: string, partnerId: string) {
    const order = await this.findById(orderId);
    assertAssignedPartner(order, partnerId);
    assertTransition(order, OrderStatus.DELIVERED);
    pushHistory(order, OrderStatus.DELIVERED, UserRole.DELIVERY_PARTNER, partnerId);
    await order.save();
    emitOrderStatusChanged({ orderId: order.id, status: order.status, restaurantId: order.restaurantId.toString(), assignedDeliveryPartnerId: order.assignedDeliveryPartnerId?.toString(), at: new Date() });
    void notificationEventsService.notifyOrderStatusChange(order);
    return order;
  },
};
