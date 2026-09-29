import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminRestaurantsService } from '../data/admin-restaurants.service';
import type { AdminRestaurant, RestaurantApplication } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Restaurants</h1>
        <p class="text-secondary text-sm">Manage restaurants and pending applications.</p>
      </div>

      <div class="tabs mb-4">
        <button class="btn btn-outline" [class.btn-active]="tab() === 'all'" (click)="setTab('all')">All Restaurants</button>
        <button class="btn btn-outline" [class.btn-active]="tab() === 'approvals'" (click)="setTab('approvals')">Pending Approvals</button>
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 20%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 10%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
          </div>
        </div>
      } @else if (tab() === 'all') {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cuisines</th>
                <th>Status</th>
                <th>Rating</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of restaurants(); track r._id) {
                <tr>
                  <td class="font-medium">{{ r.name }}</td>
                  <td class="text-secondary">{{ r.cuisines.join(', ') || '—' }}</td>
                  <td>
                    <app-status-badge [label]="r.status" [tone]="r.status === 'APPROVED' ? 'success' : 'danger'" />
                  </td>
                  <td>
                    @if (r.rating?.avg) {
                      <span class="rating-display">★ {{ r.rating!.avg!.toFixed(1) }} <span class="text-secondary">({{ r.rating!.count }})</span></span>
                    } @else {
                      <span class="text-secondary">—</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (r.status === 'APPROVED') {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === r._id" (click)="suspend(r)">
                          {{ actionLoading() === r._id ? 'Saving...' : 'Suspend' }}
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === r._id" (click)="activate(r)">
                          {{ actionLoading() === r._id ? 'Saving...' : 'Reactivate' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-8 text-secondary">
                    No restaurants found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Restaurant</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (a of applications(); track a._id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ a.ownerDetails.name }}</div>
                    <div class="text-secondary text-sm">{{ a.ownerDetails.mobile }}</div>
                  </td>
                  <td class="font-medium">{{ a.restaurantDetails.name }}</td>
                  <td>
                    <app-status-badge [label]="a.status" tone="warning" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (a.status === 'PENDING') {
                        <button class="btn btn-sm btn-primary" [disabled]="actionLoading() === a._id" (click)="approve(a)">
                           {{ actionLoading() === a._id ? 'Saving...' : 'Approve' }}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === a._id" (click)="reject(a)">
                           {{ actionLoading() === a._id ? 'Saving...' : 'Reject' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-secondary">
                    No pending applications.
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
      .rating-display {
        font-weight: 500;
        color: #eab308;
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
export class AdminRestaurantsComponent implements OnInit {
  private readonly restaurantsService = inject(AdminRestaurantsService);

  readonly tab = signal<'all' | 'approvals'>('all');
  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly restaurants = signal<AdminRestaurant[]>([]);
  readonly applications = signal<RestaurantApplication[]>([]);

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
      if (this.tab() === 'all') {
        this.restaurants.set((await this.restaurantsService.list()).items);
      } else {
        this.applications.set((await this.restaurantsService.listApplications('PENDING')).items);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async suspend(r: AdminRestaurant): Promise<void> {
    if (!window.confirm(`Are you sure you want to suspend ${r.name}?`)) {
      return;
    }
    this.actionLoading.set(r._id);
    try {
      await this.restaurantsService.suspend(r._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async activate(r: AdminRestaurant): Promise<void> {
    this.actionLoading.set(r._id);
    try {
      await this.restaurantsService.activate(r._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async approve(a: RestaurantApplication): Promise<void> {
    this.actionLoading.set(a._id);
    try {
      await this.restaurantsService.approveApplication(a._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async reject(a: RestaurantApplication): Promise<void> {
    const reason = window.prompt('Rejection reason?') || 'Not specified';
    if (!reason) return; // Allow cancel prompt
    this.actionLoading.set(a._id);
    try {
      await this.restaurantsService.rejectApplication(a._id, reason);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
