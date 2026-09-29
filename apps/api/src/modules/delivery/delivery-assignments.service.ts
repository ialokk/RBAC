import { OrderStatus } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { platformConfigService } from '../common/platform-config.service';
import { env } from '../../config/env';
import { OrderModel } from '../orders/order.model';
import { ordersService } from '../orders/orders.service';
import { RestaurantModel } from '../restaurants/restaurant.model';
import { DeliveryAssignmentModel, type DeliveryAssignmentHydratedDocument } from './delivery-assignment.model';
import { DeliveryPartnerModel } from './delivery-partner.model';
import { deliveryPartnersService } from './delivery-partners.service';
import { generateDeliveryOtpCode, hashDeliveryOtpCode, verifyDeliveryOtpCode } from './delivery-otp.util';
import { LocationUpdateModel } from './location-update.model';
import { emitAssignmentCancelled, emitAssignmentOffered, emitPartnerLocationUpdate } from '../../sockets/realtime-events.service';
import { notificationDispatchService } from '../notifications/notification-dispatch.service';

const ACTIVE_ASSIGNMENT_STATUSES: DeliveryAssignmentHydratedDocument['status'][] = [
  'ACCEPTED',
  'ARRIVED_AT_RESTAURANT',
  'PICKED_UP',
  'ARRIVED_AT_CUSTOMER',
];

const MAX_MATCHED_PARTNERS = 5;

async function getOwnAssignmentOrThrow(partnerDocId: string, assignmentId: string) {
  const assignment = await DeliveryAssignmentModel.findOne({ _id: assignmentId, partnerId: partnerDocId });
  if (!assignment) {
    throw new HttpError(404, 'Assignment not found');
  }
  return assignment;
}

// Real "assignment engine" matching (Phase 6) — ranks by proximity to the restaurant via the
// 2dsphere-indexed geo fields (docs/ERD.md §3). Falls back to any AVAILABLE partner when the
// restaurant or partners have no coordinates yet (dev/seed data), so behavior degrades gracefully
// rather than offering nothing.
async function matchNearestPartners(restaurantId: string, excludePartnerIds: string[]) {
  const restaurant = await RestaurantModel.findById(restaurantId);
  const geo = restaurant?.address.geo;
  const baseFilter: Record<string, unknown> = {
    status: 'APPROVED',
    availability: 'AVAILABLE',
    _id: { $nin: excludePartnerIds },
  };

  if (geo?.coordinates) {
    const nearby = await DeliveryPartnerModel.find({
      ...baseFilter,
      currentLocation: { $near: { $geometry: geo } },
    }).limit(MAX_MATCHED_PARTNERS);
    if (nearby.length > 0) {
      return nearby;
    }
  }

  return DeliveryPartnerModel.find(baseFilter).limit(MAX_MATCHED_PARTNERS);
}

export const deliveryAssignmentsService = {
  // Broadcasts an OFFERED assignment to the nearest available partners (docs/ORDER-STATE-MACHINE.md
  // §4: "System offers the order out for delivery"); whichever partner accepts first wins and the
  // rest are auto-cancelled. `excludePartnerIds` lets `reassign()` skip partners who already saw
  // (and didn't act on) this order.
  async offerToAvailablePartners(orderId: string, excludePartnerIds: string[] = []) {
    const order = await ordersService.findById(orderId);
    const matchedPartners = await matchNearestPartners(order.restaurantId.toString(), excludePartnerIds);
    if (matchedPartners.length === 0) {
      return { offeredCount: 0 };
    }
    await ordersService.markDeliveryAssigned(orderId);
    const created = await DeliveryAssignmentModel.insertMany(
      matchedPartners.map((partner) => ({ orderId, partnerId: partner._id, status: 'OFFERED', offeredAt: new Date() })),
    );
    for (const assignment of created) {
      emitAssignmentOffered({
        assignmentId: assignment.id,
        orderId,
        partnerId: assignment.partnerId.toString(),
        offeredAt: assignment.offeredAt,
      });
    }
    return { offeredCount: matchedPartners.length };
  },

  // Admin-triggered (`POST /orders/:id/reassign-delivery`) or node-cron timeout-triggered
  // (docs/ORDER-STATE-MACHINE.md §5: "DELIVERY_ASSIGNED unaccepted beyond SLA") re-broadcast.
  // Cancels any still-open offers, excludes partners who already saw this order, and retries a
  // bounded number of ROUNDS before the order is auto-cancelled (docs/ORDER-STATE-MACHINE.md §6).
  async reassign(orderId: string) {
    const order = await ordersService.findById(orderId);
    if (order.status !== OrderStatus.DELIVERY_ASSIGNED) {
      throw new HttpError(409, `Cannot reassign delivery while order is ${order.status}`);
    }

    const priorPartnerIds = await DeliveryAssignmentModel.distinct('partnerId', { orderId });
    await this.cancelOpenOffers(orderId, 'Reassigned to another partner');

    return this.runAssignmentRound(orderId, priorPartnerIds.map((id) => id.toString()));
  },

  // One retry ROUND: increments the order-level attempt counter exactly once (regardless of how
  // many partners the round ends up offering to), then either re-broadcasts or, once the configured
  // maximum is reached with still no partner, cancels the order. Shared by the admin reassign route
  // and both node-cron delivery paths so the attempt budget is counted identically everywhere.
  async runAssignmentRound(orderId: string, excludePartnerIds: string[] = []) {
    const attemptNumber = await ordersService.recordDeliveryAssignmentAttempt(orderId);
    const result = await this.offerToAvailablePartners(orderId, excludePartnerIds);

    if (result.offeredCount > 0) {
      return { ...result, cancelled: false, attemptNumber };
    }

    // Round produced no eligible partner. Keep retrying while the budget allows — the customer just
    // keeps seeing "finding a delivery partner", never an internal matching error.
    if (attemptNumber < env.MAX_DELIVERY_REASSIGN_ATTEMPTS) {
      return { offeredCount: 0, cancelled: false, attemptNumber };
    }

    await this.cancelOpenOffers(orderId, 'Order cancelled — no delivery partner available');
    const { cancelled } = await ordersService.cancelForNoDeliveryPartner(orderId, attemptNumber);
    return { offeredCount: 0, cancelled, attemptNumber };
  },

  // Closes every still-open OFFER for an order and tells those partners over Socket.IO, so a
  // partner can never accept an offer for an order that has moved on (or been cancelled).
  async cancelOpenOffers(orderId: string, reason: string) {
    const openOffers = await DeliveryAssignmentModel.find({ orderId, status: 'OFFERED' });
    if (openOffers.length === 0) {
      return 0;
    }
    await DeliveryAssignmentModel.updateMany(
      { orderId, status: 'OFFERED' },
      { $set: { status: 'CANCELLED', respondedAt: new Date() } },
    );
    for (const offer of openOffers) {
      emitAssignmentCancelled(offer.partnerId.toString(), offer.id, reason);
    }
    return openOffers.length;
  },

  // Customer-facing tracking (GET /orders/:id/tracking) needs an assignment id to join the
  // `/tracking` `assignment:<id>` Socket.IO room — most recent non-cancelled assignment for the
  // order, active or already accepted (post-Phase-13 integration: frontend tracking wiring).
  async findCurrentAssignmentIdForOrder(orderId: string): Promise<string | null> {
    const assignment = await DeliveryAssignmentModel.findOne({ orderId, status: { $ne: 'CANCELLED' } }).sort({
      createdAt: -1,
    });
    return assignment?.id ?? null;
  },

  async listAvailableForPartner(userId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignments = await DeliveryAssignmentModel.find({ partnerId: partner.id, status: 'OFFERED' }).sort({ offeredAt: -1 });
    return this.withOrderSummaries(assignments);
  },

  async getCurrentForPartner(userId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await DeliveryAssignmentModel.findOne({
      partnerId: partner.id,
      status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    }).sort({ offeredAt: -1 });
    if (!assignment) {
      return null;
    }
    const [withSummary] = await this.withOrderSummaries([assignment]);
    return withSummary;
  },

  async accept(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'OFFERED') {
      throw new HttpError(409, `Assignment is already ${assignment.status}`);
    }

    assignment.status = 'ACCEPTED';
    assignment.respondedAt = new Date();
    await assignment.save();

    await ordersService.assignDeliveryPartner(assignment.orderId.toString(), partner.id);
    partner.availability = 'BUSY';
    await partner.save();

    // Any sibling offers for the same order are no longer relevant.
    const siblingOffers = await DeliveryAssignmentModel.find({
      orderId: assignment.orderId,
      _id: { $ne: assignment._id },
      status: 'OFFERED',
    });
    await DeliveryAssignmentModel.updateMany(
      { orderId: assignment.orderId, _id: { $ne: assignment._id }, status: 'OFFERED' },
      { $set: { status: 'CANCELLED', respondedAt: new Date() } },
    );
    for (const offer of siblingOffers) {
      emitAssignmentCancelled(offer.partnerId.toString(), offer.id, 'Order assigned to another partner');
    }

    const [withSummary] = await this.withOrderSummaries([assignment]);
    return withSummary;
  },

  async decline(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'OFFERED') {
      throw new HttpError(409, `Assignment is already ${assignment.status}`);
    }
    assignment.status = 'DECLINED';
    assignment.respondedAt = new Date();
    await assignment.save();
    return assignment;
  },

  async arrivedAtRestaurant(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'ACCEPTED') {
      throw new HttpError(409, `Cannot mark arrived-at-restaurant while assignment is ${assignment.status}`);
    }
    assignment.status = 'ARRIVED_AT_RESTAURANT';
    await assignment.save();
    return assignment;
  },

  async pickedUp(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'ARRIVED_AT_RESTAURANT') {
      throw new HttpError(409, `Cannot mark picked-up while assignment is ${assignment.status}`);
    }
    assignment.status = 'PICKED_UP';
    assignment.pickedUpAt = new Date();
    await assignment.save();

    const order = await ordersService.markPickedUpForDelivery(assignment.orderId.toString(), partner.id);

    // Generate the hand-off OTP now that the order is en route to being picked up by the customer.
    const code = generateDeliveryOtpCode();
    order.deliveryOtpHash = await hashDeliveryOtpCode(code);
    await order.save();
    void notificationDispatchService.dispatch({
      userId: order.customerId.toString(),
      type: 'DELIVERY_OTP',
      title: 'Delivery verification code',
      body: `Your delivery OTP is ${code}. Share it with the delivery partner only at hand-off.`,
    });

    return assignment;
  },

  async arrivedAtCustomer(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'PICKED_UP') {
      throw new HttpError(409, `Cannot mark arrived-at-customer while assignment is ${assignment.status}`);
    }
    assignment.status = 'ARRIVED_AT_CUSTOMER';
    await assignment.save();
    await ordersService.markOutForDelivery(assignment.orderId.toString(), partner.id);
    return assignment;
  },

  async verifyOtp(userId: string, assignmentId: string, code: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'ARRIVED_AT_CUSTOMER') {
      throw new HttpError(409, 'OTP can only be verified after arriving at the customer');
    }
    const order = await ordersService.findById(assignment.orderId.toString());
    if (!order.deliveryOtpHash) {
      throw new HttpError(409, 'No delivery OTP has been generated for this order');
    }
    const isValid = await verifyDeliveryOtpCode(code, order.deliveryOtpHash);
    if (!isValid) {
      throw new HttpError(400, 'Invalid OTP code');
    }
    assignment.otpVerifiedAt = new Date();
    await assignment.save();
    return assignment;
  },

  async markDelivered(userId: string, assignmentId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const assignment = await getOwnAssignmentOrThrow(partner.id, assignmentId);
    if (assignment.status !== 'ARRIVED_AT_CUSTOMER') {
      throw new HttpError(409, `Cannot mark delivered while assignment is ${assignment.status}`);
    }
    if (!assignment.otpVerifiedAt) {
      throw new HttpError(409, 'Delivery OTP must be verified before marking delivered');
    }
    assignment.status = 'DELIVERED';
    assignment.deliveredAt = new Date();
    await assignment.save();

    await ordersService.markDeliveredForDelivery(assignment.orderId.toString(), partner.id);

    partner.availability = 'AVAILABLE';
    await partner.save();

    return assignment;
  },

  async recordLocationHeartbeat(userId: string, lat: number, lng: number) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const activeAssignment = await DeliveryAssignmentModel.findOne({
      partnerId: partner.id,
      status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    });
    if (!activeAssignment) {
      throw new HttpError(403, 'Location updates are only accepted during an active assignment');
    }
    await deliveryPartnersService.recordLocation(partner.id, lat, lng);
    const recordedAt = new Date();
    await LocationUpdateModel.create({
      assignmentId: activeAssignment._id,
      partnerId: partner.id,
      point: { type: 'Point', coordinates: [lng, lat] },
      recordedAt,
    });
    emitPartnerLocationUpdate({ assignmentId: activeAssignment.id, lat, lng, recordedAt });
  },

  async history(userId: string, page: number, limit: number) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const filter = { partnerId: partner.id, status: 'DELIVERED' as const };
    const [items, total] = await Promise.all([
      DeliveryAssignmentModel.find(filter)
        .sort({ deliveredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DeliveryAssignmentModel.countDocuments(filter),
    ]);
    return { items: await this.withOrderSummaries(items), total, page, limit };
  },

  async earnings(userId: string) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(userId);
    const deliveredCount = await DeliveryAssignmentModel.countDocuments({ partnerId: partner.id, status: 'DELIVERED' });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const deliveredToday = await DeliveryAssignmentModel.countDocuments({
      partnerId: partner.id,
      status: 'DELIVERED',
      deliveredAt: { $gte: startOfToday },
    });

    const perDelivery = (await platformConfigService.getConfig()).deliveryPartnerEarningMinor;
    return {
      perDeliveryRate: perDelivery,
      totalDeliveries: deliveredCount,
      totalEarnings: deliveredCount * perDelivery,
      today: { deliveries: deliveredToday, earnings: deliveredToday * perDelivery },
    };
  },

  // Denormalizes a handful of order + restaurant fields onto each assignment for list/detail
  // responses (restaurant name/address for "navigate to restaurant"), avoiding a separate document
  // array on the assignment schema (kept clean per docs/ERD.md §2.15).
  async withOrderSummaries(assignments: DeliveryAssignmentHydratedDocument[]) {
    const orderIds = assignments.map((a) => a.orderId);
    const orders = await OrderModel.find({ _id: { $in: orderIds } });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const restaurantIds = orders.map((o) => o.restaurantId);
    const restaurants = await RestaurantModel.find({ _id: { $in: restaurantIds } });
    const restaurantById = new Map(restaurants.map((r) => [r.id, r]));

    return assignments.map((assignment) => {
      const order = orderById.get(assignment.orderId.toString());
      const restaurant = order ? restaurantById.get(order.restaurantId.toString()) : undefined;
      return {
        id: assignment.id,
        orderId: assignment.orderId,
        status: assignment.status,
        offeredAt: assignment.offeredAt,
        respondedAt: assignment.respondedAt,
        pickedUpAt: assignment.pickedUpAt,
        deliveredAt: assignment.deliveredAt,
        otpVerifiedAt: assignment.otpVerifiedAt,
        order: order
          ? {
              id: order.id,
              status: order.status as OrderStatus,
              restaurantId: order.restaurantId,
              restaurantName: restaurant?.name,
              restaurantAddress: restaurant?.address,
              deliveryAddressSnapshot: order.deliveryAddressSnapshot,
              pricing: order.pricing,
              itemsCount: order.items.reduce((sum, item) => sum + item.qty, 0),
            }
          : null,
      };
    });
  },
};
