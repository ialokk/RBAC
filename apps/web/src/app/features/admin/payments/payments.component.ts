import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminPaymentsService } from '../data/admin-payments.service';
import type { AdminPayment } from '../data/models';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Payments</h1>
      <div class="filters">
        <select [(ngModel)]="status" (ngModelChange)="load()">
          <option [value]="undefined">All statuses</option>
          <option value="INITIATED">Initiated</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUND_PENDING">Refund Pending</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select [(ngModel)]="gateway" (ngModelChange)="load()">
          <option [value]="undefined">All gateways</option>
          <option value="COD">COD</option>
          <option value="razorpay">Razorpay</option>
        </select>
      </div>
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Gateway/Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments(); track p._id) {
              <tr>
                <td>{{ p.orderId }}</td>
                <td>{{ p.gateway }} / {{ p.method }}</td>
                <td>{{ (p.amount / 100).toFixed(2) }}</td>
                <td>{{ p.status }}</td>
                <td>
                  @if (p.gateway === 'COD' && p.status === 'INITIATED') {
                    <button (click)="reconcile(p)">Reconcile COD</button>
                  }
                  @if (p.status === 'SUCCESS') {
                    <button (click)="refund(p)">Refund</button>
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
        display: flex;
        gap: 0.5rem;
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
export class AdminPaymentsComponent implements OnInit {
  private readonly paymentsService = inject(AdminPaymentsService);

  status: string | undefined;
  gateway: string | undefined;

  readonly loading = signal(true);
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
    await this.paymentsService.reconcileCod(p._id);
    await this.load();
  }

  async refund(p: AdminPayment): Promise<void> {
    const reason = window.prompt('Refund reason?') || 'Refunded by admin';
    const amountStr = window.prompt('Refund amount in rupees (leave blank for full refund)?');
    const amount = amountStr ? Math.round(Number(amountStr) * 100) : undefined;
    await this.paymentsService.refund(p._id, amount, reason);
    await this.load();
  }
}
