import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminService } from '../data/admin.service';
import type { AuditLogEntry } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Audit Logs</h1>
        <p class="text-secondary text-sm">System activity tracking and compliance logging.</p>
      </div>

      <div class="filters">
        <input class="field search-field" placeholder="Filter by action (e.g. USER_SUSPENDED)" [(ngModel)]="action" (change)="load()" />
        <input class="field search-field" placeholder="Filter by target type (e.g. User)" [(ngModel)]="targetType" (change)="load()" />
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5,6,7,8]">
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
          </div>
        </div>
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry._id) {
                <tr>
                  <td class="text-secondary text-sm">{{ entry.createdAt | date: 'short' }}</td>
                  <td>
                    <app-status-badge [label]="entry.action" tone="neutral" />
                  </td>
                  <td>
                    <span class="font-medium">{{ entry.targetType }}</span>
                    <br />
                    <span class="text-secondary text-sm font-mono">{{ entry.targetId }}</span>
                  </td>
                  <td>
                    @if (entry.actorUserId) {
                      <span class="font-mono text-sm">{{ entry.actorUserId }}</span>
                    } @else {
                      <app-status-badge label="SYSTEM" tone="info" />
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-secondary">
                    No audit logs found matching the filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        @if (total() > 0) {
          <div class="pagination-summary">
            <span class="text-secondary text-sm">Total entries: {{ total() }}</span>
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
        min-width: 240px;
        max-width: 300px;
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
      .font-mono { font-family: monospace; }
      .text-center { text-align: center; }
      .py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
      
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
export class AdminAuditLogsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  action = '';
  targetType = '';

  readonly loading = signal(true);
  readonly entries = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.adminService.listAuditLogs(1, 20, this.action || undefined, this.targetType || undefined);
      this.entries.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }
}
