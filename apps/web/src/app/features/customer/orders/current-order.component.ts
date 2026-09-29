import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { SocketService } from '../../../core/realtime/socket.service';
import { OrdersService } from '../data/orders.service';
import { orderStatusLabel } from '../data/order-status-label';
import type { Order, OrderStatusHistoryEntry } from '../data/models';

const TERMINAL_STATUSES = new Set([
  'DELIVERED',
  'CUSTOMER_CANCELLED',
  'RESTAURANT_CANCELLED',
  'DELIVERY_CANCELLED',
  'RESTAURANT_REJECTED',
  'PAYMENT_FAILED',
  'REFUND_PENDING',
  'REFUNDED',
]);

// Live tracking: joins the order's `/orders` room for status pushes and, once a delivery partner
// is assigned, the assignment's `/tracking` room for location pushes — both namespaces already
// exist server-side (Phase 8); this wires the customer-facing consumer that was never built.
@Component({
  selector: 'app-current-order',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './current-order.component.html',
})
export class CurrentOrderComponent implements OnInit, OnDestroy {
  readonly statusLabel = orderStatusLabel;
  private readonly ordersService = inject(OrdersService);
  private readonly socketService = inject(SocketService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly partnerLocation = signal<{ lat: number; lng: number } | null>(null);

  private orderId: string | null = null;
  private assignmentId: string | null = null;

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const order = await this.ordersService.current();
      this.order.set(order);
      if (order && !TERMINAL_STATUSES.has(order.status)) {
        await this.startTracking(order._id);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async startTracking(orderId: string): Promise<void> {
    this.orderId = orderId;
    const tracking = await this.ordersService.tracking(orderId);
    this.assignmentId = tracking.assignmentId;
    this.partnerLocation.set(tracking.partnerLocation);

    const ordersSocket = this.socketService.connectNamespace('/orders');
    const joinOrderRoom = () => ordersSocket.emit('join-order', { orderId });
    ordersSocket.on('connect', joinOrderRoom);
    joinOrderRoom();

    ordersSocket.on(
      'order:status-changed',
      (payload: { orderId: string; status: string; at: string; reason?: string }) => {
        if (payload.orderId !== this.orderId) return;
        const current = this.order();
        if (!current) return;
        const historyEntry: OrderStatusHistoryEntry = {
          status: payload.status,
          at: payload.at,
          actorRole: 'SYSTEM',
          reason: payload.reason,
        };
        this.order.set({ ...current, status: payload.status, statusHistory: [...current.statusHistory, historyEntry] });
        if (TERMINAL_STATUSES.has(payload.status)) {
          this.stopTracking();
        }
      },
    );

    if (this.assignmentId) {
      this.joinAssignmentRoom(this.assignmentId);
    }
  }

  private joinAssignmentRoom(assignmentId: string): void {
    const trackingSocket = this.socketService.connectNamespace('/tracking');
    const joinAssignmentRoom = () => trackingSocket.emit('join-assignment', { assignmentId });
    trackingSocket.on('connect', joinAssignmentRoom);
    joinAssignmentRoom();

    trackingSocket.on('tracking:location', (payload: { assignmentId: string; lat: number; lng: number }) => {
      if (payload.assignmentId !== assignmentId) return;
      this.partnerLocation.set({ lat: payload.lat, lng: payload.lng });
    });
  }

  private stopTracking(): void {
    if (this.orderId) {
      this.socketService.connectNamespace('/orders').emit('leave-order', { orderId: this.orderId });
    }
    if (this.assignmentId) {
      this.socketService.connectNamespace('/tracking').emit('leave-assignment', { assignmentId: this.assignmentId });
    }
    this.socketService.disconnectNamespace('/orders');
    this.socketService.disconnectNamespace('/tracking');
  }

  mapUrl(): string | null {
    const location = this.partnerLocation();
    return location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null;
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
