import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminOrdersService } from '../data/admin-orders.service';
import type { AdminOrder } from '../data/models';

const CANCELLABLE_STATUSES = new Set(['CREATED', 'PAYMENT_PENDING', 'RESTAURANT_PENDING', 'RESTAURANT_ACCEPTED', 'PREPARING']);

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Orders</h1>
      <div class="filters">
        <input type="search" placeholder="Filter by status (e.g. DELIVERY_ASSIGNED)" [(ngModel)]="status" (change)="load()" />
      </div>
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o._id) {
              <tr>
                <td>{{ o._id }}</td>
                <td>{{ o.status }}</td>
                <td>{{ o.paymentMethod }}</td>
                <td>{{ (o.pricing.grandTotal / 100).toFixed(2) }}</td>
                <td>
                  @if (isCancellable(o)) {
                    <button (click)="cancel(o)">Cancel</button>
                  }
                  @if (o.status === 'DELIVERY_ASSIGNED') {
                    <button (click)="reassign(o)">Reassign Delivery</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p>Total: {{ total() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 1rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 1px solid #eee;
      }
      button {
        margin-right: 0.25rem;
      }
    `,
  ],
})
export class AdminOrdersComponent implements OnInit {
  private readonly ordersService = inject(AdminOrdersService);

  status = '';

  readonly loading = signal(true);
  readonly orders = signal<AdminOrder[]>([]);
  readonly total = signal(0);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.ordersService.list(this.status || undefined);
      this.orders.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  isCancellable(o: AdminOrder): boolean {
    return CANCELLABLE_STATUSES.has(o.status);
  }

  async cancel(o: AdminOrder): Promise<void> {
    const reason = window.prompt('Cancellation reason?') || 'Cancelled by admin';
    await this.ordersService.cancel(o._id, reason);
    await this.load();
  }

  async reassign(o: AdminOrder): Promise<void> {
    await this.ordersService.reassignDelivery(o._id);
    await this.load();
  }
}
