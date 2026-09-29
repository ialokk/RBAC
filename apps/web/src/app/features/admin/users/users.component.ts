import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminUsersService } from '../data/admin-users.service';
import type { AdminUser } from '../data/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Users</h1>
      <div class="filters">
        <select [(ngModel)]="role" (ngModelChange)="load()">
          <option [value]="undefined">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="RESTAURANT">Restaurant</option>
          <option value="DELIVERY_PARTNER">Delivery Partner</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select [(ngModel)]="status" (ngModelChange)="load()">
          <option [value]="undefined">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <input type="search" placeholder="Search name/mobile/email" [(ngModel)]="q" (change)="load()" />
      </div>
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user._id) {
              <tr>
                <td>{{ user.name || '—' }}</td>
                <td>{{ user.mobile || user.email || '—' }}</td>
                <td>{{ user.role }}</td>
                <td>{{ user.status }}</td>
                <td>
                  @if (user.status !== 'ACTIVE') {
                    <button (click)="setStatus(user, 'ACTIVE')">Activate</button>
                  }
                  @if (user.status !== 'SUSPENDED') {
                    <button (click)="setStatus(user, 'SUSPENDED')">Suspend</button>
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
        flex-wrap: wrap;
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
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);

  role: string | undefined;
  status: string | undefined;
  q = '';

  readonly loading = signal(true);
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
    await this.usersService.setStatus(user._id, status);
    await this.load();
  }
}
