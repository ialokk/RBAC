import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminDeliveryService } from '../data/admin-delivery.service';
import type { AdminDeliveryPartner } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-delivery-partners',
  standalone: true,
  imports: [CommonModule, AdminNavComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Delivery Partners</h1>
        <p class="text-secondary text-sm">Manage delivery partners and pending applications.</p>
      </div>

      <div class="tabs mb-4">
        <button class="btn btn-outline" [class.btn-active]="tab() === 'all'" (click)="setTab('all')">All Partners</button>
        <button class="btn btn-outline" [class.btn-active]="tab() === 'approvals'" (click)="setTab('approvals')">Pending Approvals</button>
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
                <th>Partner</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Availability</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of partners(); track p._id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ p.personalDetails.name }}</div>
                    <div class="text-secondary text-sm">{{ p.personalDetails.mobile }}</div>
                  </td>
                  <td>
                    <div class="font-medium">{{ p.vehicleDetails.registrationNumber }}</div>
                    <div class="text-secondary text-sm">{{ p.vehicleDetails.type }}</div>
                  </td>
                  <td>
                    <app-status-badge [label]="p.status" [tone]="p.status === 'APPROVED' ? 'success' : (p.status === 'PENDING' ? 'warning' : 'danger')" />
                  </td>
                  <td>
                    <app-status-badge [label]="p.availability" [tone]="p.availability === 'AVAILABLE' ? 'success' : 'neutral'" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (p.status === 'PENDING') {
                        <button class="btn btn-sm btn-primary" [disabled]="actionLoading() === p._id" (click)="approve(p)">
                           {{ actionLoading() === p._id ? 'Saving...' : 'Approve' }}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === p._id" (click)="reject(p)">
                           {{ actionLoading() === p._id ? 'Saving...' : 'Reject' }}
                        </button>
                      }
                      @if (p.status === 'APPROVED') {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === p._id" (click)="suspend(p)">
                           {{ actionLoading() === p._id ? 'Saving...' : 'Suspend' }}
                        </button>
                      }
                      @if (p.status === 'SUSPENDED') {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === p._id" (click)="activate(p)">
                           {{ actionLoading() === p._id ? 'Saving...' : 'Reactivate' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-8 text-secondary">
                    No delivery partners found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.5rem;
      }
      .btn-active {
        background: var(--surface-hover, #f0f0f0);
        border-color: var(--border, #ddd);
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
    `,
  ],
})
export class AdminDeliveryPartnersComponent implements OnInit {
  private readonly deliveryService = inject(AdminDeliveryService);

  readonly tab = signal<'all' | 'approvals'>('all');
  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
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
    this.actionLoading.set(p._id);
    try {
      await this.deliveryService.approve(p._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async reject(p: AdminDeliveryPartner): Promise<void> {
    const reason = window.prompt('Rejection reason?') || 'Not specified';
    if (!reason) return;
    this.actionLoading.set(p._id);
    try {
      await this.deliveryService.reject(p._id, reason);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async suspend(p: AdminDeliveryPartner): Promise<void> {
    if (!window.confirm(`Are you sure you want to suspend ${p.personalDetails.name}?`)) {
      return;
    }
    this.actionLoading.set(p._id);
    try {
      await this.deliveryService.suspend(p._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async activate(p: AdminDeliveryPartner): Promise<void> {
    this.actionLoading.set(p._id);
    try {
      await this.deliveryService.activate(p._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
