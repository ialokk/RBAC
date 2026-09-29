import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminService } from '../data/admin.service';

type ReportName = 'orders' | 'sales' | 'restaurants' | 'delivery-partners' | 'customers';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Reports</h1>
        <p class="text-secondary text-sm">Generate and export platform data.</p>
      </div>

      <div class="tabs mb-4">
        @for (name of reportNames; track name) {
          <button class="btn btn-outline" [class.btn-active]="selected() === name" (click)="select(name)">
            {{ formatName(name) }}
          </button>
        }
      </div>

      @if (selected() === 'orders' || selected() === 'sales') {
        <div class="date-filters form-card mb-4">
          <div class="form-group">
            <label class="label">From Date</label>
            <input class="field" type="date" [(ngModel)]="from" (change)="load()" />
          </div>
          <div class="form-group">
            <label class="label">To Date</label>
            <input class="field" type="date" [(ngModel)]="to" (change)="load()" />
          </div>
        </div>
      }

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 100%; height: 20px;"></div>
          </div>
        </div>
      } @else {
        <div class="report-result">
          <pre>{{ result() | json }}</pre>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .btn-active {
        background: var(--surface-hover, #f0f0f0);
        border-color: var(--border, #ddd);
      }
      
      .date-filters {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
      }
      
      .form-card {
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        padding: 1rem;
        max-width: max-content;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary, #666);
      }
      
      .report-result {
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        overflow: hidden;
      }
      
      pre {
        background: #f8f9fa;
        padding: 1.5rem;
        margin: 0;
        overflow-x: auto;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--text-primary, #111);
      }

      .mb-4 { margin-bottom: 1.5rem; }
      .text-xl { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem 0; }
      .text-sm { font-size: 0.875rem; }
      .text-secondary { color: var(--text-secondary, #666); }
      
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
    `,
  ],
})
export class AdminReportsComponent {
  private readonly adminService = inject(AdminService);

  readonly reportNames: ReportName[] = ['orders', 'sales', 'restaurants', 'delivery-partners', 'customers'];
  readonly selected = signal<ReportName>('orders');
  readonly loading = signal(false);
  readonly result = signal<unknown>(null);

  from = '';
  to = '';

  constructor() {
    void this.load();
  }

  formatName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  select(name: ReportName): void {
    this.selected.set(name);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const name = this.selected();
      if (name === 'orders') this.result.set(await this.adminService.reportOrders(this.from || undefined, this.to || undefined));
      else if (name === 'sales') this.result.set(await this.adminService.reportSales(this.from || undefined, this.to || undefined));
      else if (name === 'restaurants') this.result.set(await this.adminService.reportRestaurants());
      else if (name === 'delivery-partners') this.result.set(await this.adminService.reportDeliveryPartners());
      else this.result.set(await this.adminService.reportCustomers());
    } finally {
      this.loading.set(false);
    }
  }
}
