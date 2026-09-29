import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminUsersService } from '../data/admin-users.service';
import type { AdminUser } from '../data/models';
import { StatusBadgeComponent, toneForStatus } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Users</h1>
        <p class="text-secondary text-sm">Manage customers, restaurants, delivery partners and admins.</p>
      </div>

      <div class="filters">
        <select class="field" [(ngModel)]="role" (ngModelChange)="load()">
          <option [value]="undefined">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="RESTAURANT">Restaurant</option>
          <option value="DELIVERY_PARTNER">Delivery Partner</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select class="field" [(ngModel)]="status" (ngModelChange)="load()">
          <option [value]="undefined">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <input type="search" class="field search-field" placeholder="Search name/mobile/email" [(ngModel)]="q" (change)="load()" />
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
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user._id) {
                <tr>
                  <td class="font-medium">{{ user.name || '—' }}</td>
                  <td class="text-secondary">{{ user.mobile || user.email || '—' }}</td>
                  <td><app-status-badge [label]="user.role" tone="neutral" /></td>
                  <td><app-status-badge [label]="user.status" [tone]="user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'danger' : 'neutral'" /></td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (user.status !== 'ACTIVE') {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === user._id" (click)="setStatus(user, 'ACTIVE')">
                          {{ actionLoading() === user._id ? 'Saving...' : 'Activate' }}
                        </button>
                      }
                      @if (user.status !== 'SUSPENDED') {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === user._id" (click)="setStatus(user, 'SUSPENDED')">
                          {{ actionLoading() === user._id ? 'Saving...' : 'Suspend' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-8 text-secondary">
                    No users found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        @if (total() > 0) {
          <div class="pagination-summary">
            <span class="text-secondary text-sm">Total users: {{ total() }}</span>
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
        flex: 1;
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
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);

  role: string | undefined;
  status: string | undefined;
  q = '';

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.usersService.list({ role: this.role, status: this.status, q: this.q || undefined });
      this.users.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async setStatus(user: AdminUser, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
    if (status === 'SUSPENDED' && !window.confirm(`Are you sure you want to suspend ${user.name || user.mobile}?`)) {
      return;
    }
    
    this.actionLoading.set(user._id);
    try {
      await this.usersService.setStatus(user._id, status);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
