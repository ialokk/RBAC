import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminPaymentsService } from '../data/admin-payments.service';
import type { AdminPayment } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, StatusBadgeComponent, MoneyPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Payments</h1>
        <p class="text-secondary text-sm">Monitor platform transactions and manage refunds.</p>
      </div>

      <div class="filters">
        <select class="field search-field" [(ngModel)]="status" (ngModelChange)="load()">
          <option [value]="undefined">All statuses</option>
          <option value="INITIATED">Initiated</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUND_PENDING">Refund Pending</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select class="field search-field" [(ngModel)]="gateway" (ngModelChange)="load()">
          <option [value]="undefined">All gateways</option>
          <option value="COD">COD</option>
          <option value="razorpay">Razorpay</option>
        </select>
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 20%; height: 20px;"></div>
          </div>
        </div>
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Gateway/Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of payments(); track p._id) {
                <tr>
                  <td>
                    <a [routerLink]="['/admin/orders']" [queryParams]="{ q: p.orderId }" class="font-mono">{{ p.orderId }}</a>
                  </td>
                  <td>{{ p.gateway }} <span class="text-secondary">/ {{ p.method }}</span></td>
                  <td class="font-medium">{{ p.amount | money }}</td>
                  <td>
                    <app-status-badge [label]="p.status" [tone]="toneForStatus(p.status)" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (p.gateway === 'COD' && p.status === 'INITIATED') {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === p._id" (click)="reconcile(p)">
                          {{ actionLoading() === p._id ? 'Reconciling...' : 'Reconcile COD' }}
                        </button>
                      }
                      @if (p.status === 'SUCCESS') {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === p._id" (click)="refund(p)">
                          {{ actionLoading() === p._id ? 'Refunding...' : 'Refund' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-8 text-secondary">
                    No payments found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        @if (total() > 0) {
          <div class="pagination-summary">
            <span class="text-secondary text-sm">Total entries: {{ total() }}</span>
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
        flex-wrap: wrap;
      }
      .search-field {
        min-width: 200px;
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
      .font-mono { font-family: monospace; }
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
export class AdminPaymentsComponent implements OnInit {
  private readonly paymentsService = inject(AdminPaymentsService);

  status: string | undefined;
  gateway: string | undefined;

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly payments = signal<AdminPayment[]>([]);
  readonly total = signal(0);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.paymentsService.list({ status: this.status, gateway: this.gateway });
      this.payments.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async reconcile(p: AdminPayment): Promise<void> {
    if (!window.confirm('Mark this COD payment as reconciled?')) {
      return;
    }
    this.actionLoading.set(p._id);
    try {
      await this.paymentsService.reconcileCod(p._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async refund(p: AdminPayment): Promise<void> {
    const reason = window.prompt('Refund reason?') || 'Refunded by admin';
    const amountStr = window.prompt('Refund amount in rupees (leave blank for full refund)?');
    const amount = amountStr ? Math.round(Number(amountStr) * 100) : undefined;
    
    this.actionLoading.set(p._id);
    try {
      await this.paymentsService.refund(p._id, amount, reason);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  toneForStatus(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'INITIATED':
        return 'info';
      case 'FAILED':
        return 'danger';
      case 'REFUND_PENDING':
        return 'warning';
      case 'REFUNDED':
        return 'neutral';
      default:
        return 'neutral';
    }
  }
}
