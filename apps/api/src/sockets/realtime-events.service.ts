import type { Server as SocketIOServer } from 'socket.io';

// Single-process, single-instance Socket.IO reference (Version 1 — no Redis adapter, no
// cross-instance broadcast per docs/ARCHITECTURE.md §7). Domain services (orders, delivery) import
// only the emit* functions below, never the Server type itself, so business logic stays decoupled
// from the transport the same way payments.service.ts stays decoupled from the Razorpay SDK.
let io: SocketIOServer | null = null;

export function setSocketServer(server: SocketIOServer): void {
  io = server;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  status: string;
  restaurantId: string;
  assignedDeliveryPartnerId?: string;
  reason?: string;
  at: Date;
}

// Broadcasts to every room that has a legitimate interest in this order: the order-specific room
// (customer/admin tracking view), the restaurant's own room (live dashboard/order list), and the
// assigned partner's own room if one exists — covers "restaurant order events", "order status
// events" and "partner assigned" from docs/API-SPEC.md §17 with one call site.
export function emitOrderStatusChanged(payload: OrderStatusChangedPayload): void {
  if (!io) return;
  const ns = io.of('/orders');
  ns.to(`order:${payload.orderId}`).emit('order:status-changed', payload);
  ns.to(`restaurant:${payload.restaurantId}`).emit('order:status-changed', payload);
  if (payload.assignedDeliveryPartnerId) {
    ns.to(`partner:${payload.assignedDeliveryPartnerId}`).emit('order:status-changed', payload);
  }
}

export interface AssignmentOfferedPayload {
  assignmentId: string;
  orderId: string;
  partnerId: string;
  restaurantName?: string;
  restaurantAddress?: unknown;
  offeredAt: Date;
}

export function emitAssignmentOffered(payload: AssignmentOfferedPayload): void {
  if (!io) return;
  io.of('/tracking').to(`partner:${payload.partnerId}`).emit('assignment:offered', payload);
}

export function emitAssignmentCancelled(partnerId: string, assignmentId: string, reason: string): void {
  if (!io) return;
  io.of('/tracking').to(`partner:${partnerId}`).emit('assignment:cancelled', { assignmentId, reason });
}

export function emitPartnerAvailabilityChanged(partnerId: string, availability: string): void {
  if (!io) return;
  io.of('/tracking').to(`partner:${partnerId}`).emit('partner:availability-changed', { partnerId, availability });
}

export interface PartnerLocationPayload {
  assignmentId: string;
  lat: number;
  lng: number;
  recordedAt: Date;
}

// Authorization for who may reach this happens at the call site (delivery-assignments.service's
// recordLocationHeartbeat, which only ever broadcasts a location the caller was already verified to
// own) — this function itself just fans the already-authorized update out to room subscribers.
export function emitPartnerLocationUpdate(payload: PartnerLocationPayload): void {
  if (!io) return;
  io.of('/tracking').to(`assignment:${payload.assignmentId}`).emit('tracking:location', payload);
}
