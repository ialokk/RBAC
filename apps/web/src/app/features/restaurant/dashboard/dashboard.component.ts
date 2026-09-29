import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SocketService } from '../../../core/realtime/socket.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent, toneForStatus } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { RestaurantOrdersService } from '../data/restaurant-orders.service';
import { RestaurantProfileService } from '../data/restaurant-profile.service';
import { restaurantStatusLabel } from '../data/restaurant-status-label';
import type { DashboardSummary, OwnRestaurant, RestaurantOrder } from '../data/models';

@Component({
  selector: 'app-restaurant-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    StatCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(RestaurantOrdersService);
  private readonly profileService = inject(RestaurantProfileService);
  private readonly socketService = inject(SocketService);

  readonly statusLabel = restaurantStatusLabel;
  readonly statusTone = toneForStatus;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly restaurant = signal<OwnRestaurant | null>(null);
  readonly pendingOrders = signal<RestaurantOrder[]>([]);
  readonly togglingOpen = signal(false);

  readonly needsAction = computed(() => this.summary()?.pending ?? 0);

  readonly inKitchen = computed(() => {
    const summary = this.summary();
    return (summary?.accepted ?? 0) + (summary?.preparing ?? 0);
  });

  async ngOnInit(): Promise<void> {
    await this.load();
    // RESTAURANT sockets auto-join their own restaurant:<id> room server-side (docs/API-SPEC.md §17).
    const socket = this.socketService.connectNamespace('/orders');
    socket.on('order:status-changed', () => void this.load());
  }

  ngOnDestroy(): void {
    this.socketService.disconnectNamespace('/orders');
  }

  async load(): Promise<void> {
    this.loadError.set(false);
    try {
      const [summary, restaurant, pending] = await Promise.all([
        this.ordersService.summary(),
        this.profileService.getOwn(),
        this.ordersService.list('RESTAURANT_PENDING', 1, 5),
      ]);
      this.summary.set(summary);
      this.restaurant.set(restaurant);
      this.pendingOrders.set(pending.items);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleOpen(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant || this.togglingOpen()) return;
    this.togglingOpen.set(true);
    try {
      this.restaurant.set(await this.profileService.setOpenStatus(!restaurant.isOpen));
    } finally {
      this.togglingOpen.set(false);
    }
  }

  itemCount(order: RestaurantOrder): number {
    return order.items.reduce((sum, item) => sum + item.qty, 0);
  }
}
