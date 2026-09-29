import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../../core/realtime/socket.service';
import { StatusBadgeComponent, toneForStatus } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { RestaurantOrdersService } from '../data/restaurant-orders.service';
import { restaurantStatusLabel } from '../data/restaurant-status-label';
import type { RestaurantOrder } from '../data/models';

const ACTIVE_TABS = [
  { label: 'New', status: 'RESTAURANT_PENDING' },
  { label: 'Accepted', status: 'RESTAURANT_ACCEPTED' },
  { label: 'Preparing', status: 'PREPARING' },
  { label: 'Ready', status: 'READY_FOR_PICKUP' },
];

@Component({
  selector: 'app-restaurant-order-list',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, EmptyStateComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(RestaurantOrdersService);
  private readonly socketService = inject(SocketService);

  readonly statusLabel = restaurantStatusLabel;
  readonly statusTone = toneForStatus;

  readonly isHistory = this.route.snapshot.data['mode'] === 'history';
  readonly tabs = this.isHistory ? [] : ACTIVE_TABS;
  readonly activeStatus = signal(this.isHistory ? undefined : ACTIVE_TABS[0].status);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly orders = signal<RestaurantOrder[]>([]);
  readonly rejectingOrderId = signal<string | null>(null);
  readonly rejectReason = signal('');
  readonly prepTimeById = signal<Record<string, number>>({});
  /** Disables that order's buttons while its action is in flight, so it can't be double-submitted. */
  readonly busyOrderId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
    if (!this.isHistory) {
      // RESTAURANT sockets auto-join their own restaurant:<id> room server-side on connect
      // (docs/API-SPEC.md §17) — no explicit join call needed here, just listen.
      const socket = this.socketService.connectNamespace('/orders');
      socket.on('order:status-changed', () => this.load());
    }
  }

  ngOnDestroy(): void {
    if (!this.isHistory) {
      this.socketService.disconnectNamespace('/orders');
    }
  }

  async selectTab(status: string): Promise<void> {
    this.activeStatus.set(status);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      if (this.isHistory) {
        const [delivered, rejected, restaurantCancelled, customerCancelled] = await Promise.all([
          this.ordersService.list('DELIVERED', 1, 50),
          this.ordersService.list('RESTAURANT_REJECTED', 1, 50),
          this.ordersService.list('RESTAURANT_CANCELLED', 1, 50),
          this.ordersService.list('CUSTOMER_CANCELLED', 1, 50),
        ]);
        this.orders.set(
          [...delivered.items, ...rejected.items, ...restaurantCancelled.items, ...customerCancelled.items].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } else {
        const result = await this.ordersService.list(this.activeStatus(), 1, 50);
        this.orders.set(result.items);
      }
    } catch {
      this.loadError.set(true);
      this.orders.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  itemCount(order: RestaurantOrder): number {
    return order.items.reduce((sum, item) => sum + item.qty, 0);
  }

  private async run(orderId: string, action: () => Promise<unknown>): Promise<void> {
    if (this.busyOrderId()) return;
    this.busyOrderId.set(orderId);
    try {
      await action();
      await this.load();
    } finally {
      this.busyOrderId.set(null);
    }
  }

  prepTimeFor(orderId: string): number {
    return this.prepTimeById()[orderId] ?? 20;
  }

  setPrepTimeValue(orderId: string, value: number): void {
    this.prepTimeById.update((map) => ({ ...map, [orderId]: value }));
  }

  async accept(order: RestaurantOrder): Promise<void> {
    await this.run(order._id, () => this.ordersService.accept(order._id));
  }

  startReject(orderId: string): void {
    this.rejectingOrderId.set(orderId);
    this.rejectReason.set('');
  }

  cancelReject(): void {
    this.rejectingOrderId.set(null);
  }

  async confirmReject(order: RestaurantOrder): Promise<void> {
    if (!this.rejectReason().trim()) return;
    const reason = this.rejectReason().trim();
    await this.run(order._id, () => this.ordersService.reject(order._id, reason));
    this.rejectingOrderId.set(null);
  }

  async submitPrepTime(order: RestaurantOrder): Promise<void> {
    await this.run(order._id, () => this.ordersService.setPrepTime(order._id, this.prepTimeFor(order._id)));
  }

  async markPreparing(order: RestaurantOrder): Promise<void> {
    await this.run(order._id, () => this.ordersService.markPreparing(order._id));
  }

  async markReady(order: RestaurantOrder): Promise<void> {
    await this.run(order._id, () => this.ordersService.markReady(order._id));
  }
}
