import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../data/admin.service';
import type { DashboardSummary } from '../data/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Admin Dashboard</h1>
      @if (loading()) {
        <app-loading-spinner />
      } @else if (summary(); as s) {
        <div class="cards">
          <div class="card"><strong>{{ s.customers }}</strong><span>Customers</span></div>
          <div class="card"><strong>{{ s.restaurants }}</strong><span>Restaurants</span></div>
          <div class="card"><strong>{{ s.deliveryPartners }}</strong><span>Delivery Partners</span></div>
          <div class="card"><strong>{{ s.activeDeliveries }}</strong><span>Active Deliveries</span></div>
          <div class="card"><strong>{{ s.pendingApprovals.restaurants }}</strong><span>Pending Restaurant Approvals</span></div>
          <div class="card"><strong>{{ s.pendingApprovals.deliveryPartners }}</strong><span>Pending Delivery Approvals</span></div>
          <div class="card"><strong>{{ s.today.totalOrders }}</strong><span>Orders Today</span></div>
          <div class="card"><strong>{{ (s.today.revenue / 100).toFixed(2) }}</strong><span>Revenue Today</span></div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 6px;
      }
      .card strong {
        font-size: 1.5rem;
      }
      .card span {
        color: #666;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.summary.set(await this.adminService.dashboard());
    } finally {
      this.loading.set(false);
    }
  }
}
