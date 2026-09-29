import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { AdminService } from '../data/admin.service';
import type { DashboardSummary } from '../data/models';
import { MoneyPipe } from '../../../shared/ui/money.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminNavComponent, StatCardComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Admin Dashboard</h1>
        <p class="text-secondary text-sm">Platform overview and metrics.</p>
      </div>

      @if (loading()) {
        <div class="dashboard-grid">
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--r-md);"></div>
        </div>
      } @else if (summary(); as s) {
        <div class="dashboard-grid">
          <app-stat-card label="Customers" [value]="s.customers" icon="users" link="/admin/users" />
          <app-stat-card label="Restaurants" [value]="s.restaurants" icon="store" link="/admin/restaurants" />
          <app-stat-card label="Delivery Partners" [value]="s.deliveryPartners" icon="bike" link="/admin/delivery-partners" />
          <app-stat-card label="Active Deliveries" [value]="s.activeDeliveries" icon="package" link="/admin/orders" />
          <app-stat-card label="Pending Restaurants" [value]="s.pendingApprovals.restaurants" icon="alert-circle" link="/admin/restaurants" [highlight]="s.pendingApprovals.restaurants > 0" />
          <app-stat-card label="Pending Delivery Partners" [value]="s.pendingApprovals.deliveryPartners" icon="alert-circle" link="/admin/delivery-partners" [highlight]="s.pendingApprovals.deliveryPartners > 0" />
          <app-stat-card label="Orders Today" [value]="s.today.totalOrders" icon="receipt" link="/admin/orders" />
          <app-stat-card label="Revenue Today" [value]="s.today.revenue | money" icon="credit-card" />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }
      .mb-4 {
        margin-bottom: 1.5rem;
      }
      .text-xl {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-secondary {
        color: var(--text-secondary, #666);
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
