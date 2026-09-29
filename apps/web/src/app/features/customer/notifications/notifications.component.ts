import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { NotificationsService } from '../data/notifications.service';
import type { AppNotification } from '../data/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  readonly loading = signal(true);
  readonly notifications = signal<AppNotification[]>([]);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.notifications.set((await this.notificationsService.list()).items);
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(notification: AppNotification): Promise<void> {
    if (notification.readAt) return;
    const updated = await this.notificationsService.markRead(notification._id);
    this.notifications.update((items) => items.map((n) => (n._id === updated._id ? updated : n)));
  }
}
