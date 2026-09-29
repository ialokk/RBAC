import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../data/admin.service';
import type { AuditLogEntry } from '../data/models';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Audit Logs</h1>
      <div class="filters">
        <input placeholder="Filter by action" [(ngModel)]="action" (change)="load()" />
        <input placeholder="Filter by target type" [(ngModel)]="targetType" (change)="load()" />
      </div>
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
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
                <td>{{ entry.createdAt | date: 'short' }}</td>
                <td>{{ entry.action }}</td>
                <td>{{ entry.targetType }} / {{ entry.targetId }}</td>
                <td>{{ entry.actorUserId || 'SYSTEM' }}</td>
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
