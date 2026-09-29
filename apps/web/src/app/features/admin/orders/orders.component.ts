import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminOrdersService } from '../data/admin-orders.service';
import type { AdminOrder } from '../data/models';
import { StatusBadgeComponent, toneForStatus } from '../../../shared/ui/status-badge/status-badge.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';

const CANCELLABLE_STATUSES = new Set(['CREATED', 'PAYMENT_PENDING', 'RESTAURANT_PENDING', 'RESTAURANT_ACCEPTED', 'PREPARING']);

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, StatusBadgeComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Orders</h1>
        <p class="text-secondary text-sm">Monitor and manage platform orders.</p>
      </div>

      <div class="filters">
        <select class="field search-field" [(ngModel)]="status" (change)="load()">
          <option value="">All Statuses</option>
          <option value="CREATED">CREATED</option>
          <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
          <option value="PAID">PAID</option>
          <option value="RESTAURANT_PENDING">RESTAURANT_PENDING</option>
          <option value="RESTAURANT_ACCEPTED">RESTAURANT_ACCEPTED</option>
          <option value="PREPARING">PREPARING</option>
          <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
          <option value="DELIVERY_ASSIGNED">DELIVERY_ASSIGNED</option>
          <option value="PICKED_UP">PICKED_UP</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CUSTOMER_CANCELLED">CUSTOMER_CANCELLED</option>
          <option value="RESTAURANT_CANCELLED">RESTAURANT_CANCELLED</option>
          <option value="DELIVERY_CANCELLED">DELIVERY_CANCELLED</option>
        </select>
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 20%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
          </div>
        </div>
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Payment</th>
                <th class="text-right">Total</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (o of orders(); track o._id) {
                <tr>
                  <td class="font-medium text-sm">{{ o._id }}</td>
                  <td>
                    <app-status-badge [label]="o.status" [tone]="toneFor(o.status)" />
                  </td>
                  <td>
                    <app-status-badge [label]="o.paymentMethod" tone="neutral" />
                  </td>
                  <td class="text-right font-medium">{{ o.pricing.grandTotal | money }}</td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (isCancellable(o)) {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === o._id" (click)="cancel(o)">
                           {{ actionLoading() === o._id ? 'Saving...' : 'Cancel' }}
                        </button>
                      }
                      @if (o.status === 'DELIVERY_ASSIGNED') {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === o._id" (click)="reassign(o)">
                           {{ actionLoading() === o._id ? 'Saving...' : 'Reassign Delivery' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-8 text-secondary">
                    No orders found matching the criteria.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        @if (total() > 0) {
          <div class="pagination-summary">
            <span class="text-secondary text-sm">Total orders: {{ total() }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .filters {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }
      .search-field {
        min-width: 200px;
        max-width: 300px;
      }
      .table-container {
        overflow-x: auto;
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
      }
      .mb-4 { margin-bottom: 1.5rem; }
      .text-xl { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem 0; }
      .text-sm { font-size: 0.875rem; }
      .text-secondary { color: var(--text-secondary, #666); }
      .font-medium { font-weight: 500; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
      
      .action-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      
      /* Skeleton Table Styles */
      .skeleton-table {
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        overflow: hidden;
      }
      .skeleton-row {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--border, #e5e5e5);
        align-items: center;
      }
      .skeleton-row:last-child {
        border-bottom: none;
      }
      .pagination-summary {
        margin-top: 1rem;
        text-align: right;
      }
    `,
  ],
})
export class AdminOrdersComponent implements OnInit {
  private readonly ordersService = inject(AdminOrdersService);

  status = '';

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly orders = signal<AdminOrder[]>([]);
  readonly total = signal(0);
  readonly toneFor = toneForStatus;

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
    if (!reason) return;
    if (!window.confirm(`Are you sure you want to cancel order ${o._id}?`)) {
      return;
    }
    
    this.actionLoading.set(o._id);
    try {
      await this.ordersService.cancel(o._id, reason);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async reassign(o: AdminOrder): Promise<void> {
    if (!window.confirm(`Are you sure you want to reassign delivery for order ${o._id}?`)) {
      return;
    }
    
    this.actionLoading.set(o._id);
    try {
      await this.ordersService.reassignDelivery(o._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
