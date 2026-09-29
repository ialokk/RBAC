import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminDeliveryService } from '../data/admin-delivery.service';
import type { AdminDeliveryPartner } from '../data/models';

@Component({
  selector: 'app-admin-delivery-partners',
  standalone: true,
  imports: [CommonModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Delivery Partners</h1>
      <div class="tabs">
        <button [class.active]="tab() === 'all'" (click)="setTab('all')">All Partners</button>
        <button [class.active]="tab() === 'approvals'" (click)="setTab('approvals')">Pending Approvals</button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of partners(); track p._id) {
              <tr>
                <td>{{ p.personalDetails.name }} ({{ p.personalDetails.mobile }})</td>
                <td>{{ p.vehicleDetails.type }} — {{ p.vehicleDetails.registrationNumber }}</td>
                <td>{{ p.status }}</td>
                <td>{{ p.availability }}</td>
                <td>
                  @if (p.status === 'PENDING') {
                    <button (click)="approve(p)">Approve</button>
                    <button (click)="reject(p)">Reject</button>
                  }
                  @if (p.status === 'APPROVED') {
                    <button (click)="suspend(p)">Suspend</button>
                  }
                  @if (p.status === 'SUSPENDED') {
                    <button (click)="activate(p)">Reactivate</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .tabs button.active {
        font-weight: 600;
        text-decoration: underline;
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
export class AdminDeliveryPartnersComponent implements OnInit {
  private readonly deliveryService = inject(AdminDeliveryService);

  readonly tab = signal<'all' | 'approvals'>('all');
  readonly loading = signal(true);
  readonly partners = signal<AdminDeliveryPartner[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  setTab(tab: 'all' | 'approvals'): void {
    this.tab.set(tab);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const status = this.tab() === 'approvals' ? 'PENDING' : undefined;
      this.partners.set((await this.deliveryService.list(status)).items);
    } finally {
      this.loading.set(false);
    }
  }

  async approve(p: AdminDeliveryPartner): Promise<void> {
    await this.deliveryService.approve(p._id);
    await this.load();
  }

  async reject(p: AdminDeliveryPartner): Promise<void> {
    const reason = window.prompt('Rejection reason?') || 'Not specified';
    await this.deliveryService.reject(p._id, reason);
    await this.load();
  }

  async suspend(p: AdminDeliveryPartner): Promise<void> {
    await this.deliveryService.suspend(p._id);
    await this.load();
  }

  async activate(p: AdminDeliveryPartner): Promise<void> {
    await this.deliveryService.activate(p._id);
    await this.load();
  }
}
