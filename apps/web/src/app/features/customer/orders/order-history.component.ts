import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { OrdersService } from '../data/orders.service';
import { orderStatusLabel } from '../data/order-status-label';
import type { Order } from '../data/models';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-history.component.html',
})
export class OrderHistoryComponent implements OnInit {
  readonly statusLabel = orderStatusLabel;
  private readonly ordersService = inject(OrdersService);

  readonly loading = signal(true);
  readonly orders = signal<Order[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.ordersService.history(this.page(), 20);
      this.orders.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    this.page.update((p) => p + 1);
    await this.load();
  }
}
