import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { UserRole } from '@rbac/shared-types';
import { env } from '../config/env';
import { parseCorsOrigins } from '../config/cors';
import { verifyAccessToken } from '../modules/auth/access-token.util';
import { UserModel } from '../modules/users/user.model';
import { ordersService } from '../modules/orders/orders.service';
import { deliveryPartnersService } from '../modules/delivery/delivery-partners.service';
import { deliveryAssignmentsService } from '../modules/delivery/delivery-assignments.service';
import { restaurantsService } from '../modules/restaurants/restaurants.service';
import { DeliveryAssignmentModel } from '../modules/delivery/delivery-assignment.model';
import { setSocketServer } from './realtime-events.service';

interface SocketUser {
  id: string;
  role: UserRole;
}

type Ack = (result: { ok: boolean; error?: string }) => void;

function extractToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;
  const header = socket.handshake.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

// Runs on every new connection AND every reconnect (a Socket.IO reconnect is a brand new
// handshake) — mirrors requirePermission's DB status re-check so a just-suspended account is
// rejected immediately rather than trusting a possibly-stale JWT claim for a long-lived socket.
async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    const token = extractToken(socket);
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    const claims = verifyAccessToken(token);
    const user = await UserModel.findById(claims.sub);
    if (!user || user.status !== 'ACTIVE') {
      next(new Error('Account is not active'));
      return;
    }
    (socket.data as { user: SocketUser }).user = { id: claims.sub, role: user.role };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

function getUser(socket: Socket): SocketUser {
  return (socket.data as { user: SocketUser }).user;
}

// Ownership per docs/ROLE-PERMISSIONS.md §4 — reuses the exact same service-layer ownership checks
// the REST routes use, so a socket can never see an order the REST API would also reject.
async function authorizeOrderAccess(user: SocketUser, orderId: string): Promise<void> {
  if (user.role === UserRole.ADMIN) {
    await ordersService.getByIdAdmin(orderId);
    return;
  }
  if (user.role === UserRole.RESTAURANT) {
    await ordersService.getByIdForRestaurant(user.id, orderId);
    return;
  }
  if (user.role === UserRole.DELIVERY_PARTNER) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(user.id);
    const order = await ordersService.findById(orderId);
    if (!order.assignedDeliveryPartnerId || order.assignedDeliveryPartnerId.toString() !== partner.id) {
      throw new Error('You are not assigned to this order');
    }
    return;
  }
  await ordersService.getByIdForCustomer(user.id, orderId);
}

async function authorizeAssignmentAccess(user: SocketUser, assignmentId: string): Promise<void> {
  const assignment = await DeliveryAssignmentModel.findById(assignmentId);
  if (!assignment) {
    throw new Error('Assignment not found');
  }
  if (user.role === UserRole.ADMIN) {
    return;
  }
  if (user.role === UserRole.DELIVERY_PARTNER) {
    const partner = await deliveryPartnersService.getOwnApprovedOrThrow(user.id);
    if (assignment.partnerId.toString() !== partner.id) {
      throw new Error('This is not your assignment');
    }
    return;
  }
  if (user.role === UserRole.CUSTOMER) {
    const order = await ordersService.findById(assignment.orderId.toString());
    if (order.customerId.toString() !== user.id) {
      throw new Error('This is not your order');
    }
    return;
  }
  throw new Error('Not authorized');
}

// Rooms a socket should always be in for its role, re-joined automatically on every (re)connect so
// the client doesn't have to remember to re-subscribe to its own restaurant/partner feed after a
// dropped connection — only order/assignment-specific rooms need an explicit join from the client.
async function joinDefaultRooms(socket: Socket, ordersNsRooms: boolean): Promise<void> {
  const user = getUser(socket);
  if (user.role === UserRole.RESTAURANT && ordersNsRooms) {
    try {
      const restaurant = await restaurantsService.getOwnRestaurantOrThrow(user.id);
      socket.join(`restaurant:${restaurant.id}`);
    } catch {
      // Not yet an approved restaurant — no default room to join.
    }
  }
  if (user.role === UserRole.DELIVERY_PARTNER) {
    try {
      const partner = await deliveryPartnersService.getOwnApprovedOrThrow(user.id);
      socket.join(`partner:${partner.id}`);
    } catch {
      // Not yet an approved partner — no default room to join.
    }
  }
}

// Foundation only — namespaces/rooms and JWT-authenticated handshake are wired in Phase 8 (Tracking).
export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  // Single Socket.IO instance, no adapter — sufficient for Version 1's single backend instance
  // (docs/ARCHITECTURE.md §7); adding Redis/an adapter requires a documented architecture change.
  const io = new SocketIOServer(httpServer, {
    cors: { origin: parseCorsOrigins(env.CORS_ORIGIN), credentials: true },
  });
  setSocketServer(io);

  const ordersNamespace = io.of('/orders');
  ordersNamespace.use(authenticateSocket);
  ordersNamespace.on('connection', (socket) => {
    joinDefaultRooms(socket, true).catch(() => undefined);

    socket.on('join-order', async (payload: { orderId?: string }, ack?: Ack) => {
      try {
        if (!payload?.orderId) throw new Error('orderId is required');
        await authorizeOrderAccess(getUser(socket), payload.orderId);
        socket.join(`order:${payload.orderId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'Not authorized' });
      }
    });

    socket.on('leave-order', (payload: { orderId?: string }) => {
      if (payload?.orderId) socket.leave(`order:${payload.orderId}`);
    });
  });

  const trackingNamespace = io.of('/tracking');
  trackingNamespace.use(authenticateSocket);
  trackingNamespace.on('connection', (socket) => {
    joinDefaultRooms(socket, false).catch(() => undefined);

    socket.on('join-assignment', async (payload: { assignmentId?: string }, ack?: Ack) => {
      try {
        if (!payload?.assignmentId) throw new Error('assignmentId is required');
        await authorizeAssignmentAccess(getUser(socket), payload.assignmentId);
        socket.join(`assignment:${payload.assignmentId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'Not authorized' });
      }
    });

    socket.on('leave-assignment', (payload: { assignmentId?: string }) => {
      if (payload?.assignmentId) socket.leave(`assignment:${payload.assignmentId}`);
    });

    // Authorization for location updates: only an authenticated DELIVERY_PARTNER with a
    // currently-active assignment may push a location, and only for their own (server-resolved,
    // never client-supplied) partner id — enforced inside recordLocationHeartbeat itself, the same
    // check the REST `POST /delivery/location` heartbeat uses, so both paths share one rule.
    socket.on('location:update', async (payload: { lat?: number; lng?: number }, ack?: Ack) => {
      try {
        const user = getUser(socket);
        if (user.role !== UserRole.DELIVERY_PARTNER) {
          throw new Error('Only delivery partners may send location updates');
        }
        if (typeof payload?.lat !== 'number' || typeof payload?.lng !== 'number') {
          throw new Error('lat/lng are required');
        }
        await deliveryAssignmentsService.recordLocationHeartbeat(user.id, payload.lat, payload.lng);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'Failed to record location' });
      }
    });

    // Deliberately no side effects on disconnect (e.g. never flips availability/assignment
    // state) — a dropped socket is just a transient network blip, not an explicit status change;
    // the client re-authenticates and re-joins its rooms on reconnect via the handlers above.
    socket.on('disconnect', () => undefined);
  });

  return io;
}
