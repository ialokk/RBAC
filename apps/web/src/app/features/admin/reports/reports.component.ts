import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../data/admin.service';

type ReportName = 'orders' | 'sales' | 'restaurants' | 'delivery-partners' | 'customers';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Reports</h1>
      <div class="tabs">
        @for (name of reportNames; track name) {
          <button [class.active]="selected() === name" (click)="select(name)">{{ name }}</button>
        }
      </div>
      @if (selected() === 'orders' || selected() === 'sales') {
        <div class="date-range">
          <input type="date" [(ngModel)]="from" (change)="load()" />
          <input type="date" [(ngModel)]="to" (change)="load()" />
        </div>
      }
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <pre>{{ result() | json }}</pre>
      }
    </section>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      .tabs button.active {
        font-weight: 600;
        text-decoration: underline;
      }
      .date-range {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      pre {
        background: #f7f7f7;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
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
