import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { SocketService } from '../../../core/realtime/socket.service';
import { RestaurantOrdersService } from '../data/restaurant-orders.service';
import type { RestaurantOrder } from '../data/models';

const ACTIVE_TABS = [
  { label: 'Pending', status: 'RESTAURANT_PENDING' },
  { label: 'Accepted', status: 'RESTAURANT_ACCEPTED' },
  { label: 'Preparing', status: 'PREPARING' },
  { label: 'Ready', status: 'READY_FOR_PICKUP' },
];

@Component({
  selector: 'app-restaurant-order-list',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.component.html',
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(RestaurantOrdersService);
  private readonly socketService = inject(SocketService);

  readonly isHistory = this.route.snapshot.data['mode'] === 'history';
  readonly tabs = this.isHistory ? [] : ACTIVE_TABS;
  readonly activeStatus = signal(this.isHistory ? undefined : ACTIVE_TABS[0].status);

  readonly loading = signal(true);
  readonly orders = signal<RestaurantOrder[]>([]);
  readonly rejectingOrderId = signal<string | null>(null);
  readonly rejectReason = signal('');
  readonly prepTimeById = signal<Record<string, number>>({});

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
    } finally {
      this.loading.set(false);
    }
  }

  prepTimeFor(orderId: string): number {
    return this.prepTimeById()[orderId] ?? 20;
  }

  setPrepTimeValue(orderId: string, value: number): void {
    this.prepTimeById.update((map) => ({ ...map, [orderId]: value }));
  }

  async accept(order: RestaurantOrder): Promise<void> {
    await this.ordersService.accept(order._id);
    await this.load();
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
    await this.ordersService.reject(order._id, this.rejectReason().trim());
    this.rejectingOrderId.set(null);
    await this.load();
  }

  async submitPrepTime(order: RestaurantOrder): Promise<void> {
    await this.ordersService.setPrepTime(order._id, this.prepTimeFor(order._id));
    await this.load();
  }

  async markPreparing(order: RestaurantOrder): Promise<void> {
    await this.ordersService.markPreparing(order._id);
    await this.load();
  }

  async markReady(order: RestaurantOrder): Promise<void> {
    await this.ordersService.markReady(order._id);
    await this.load();
  }
}
