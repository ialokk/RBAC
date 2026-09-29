import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DeliveryAssignmentsService } from '../data/delivery-assignments.service';
import type { DeliveryAssignment } from '../data/models';

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private readonly assignmentsService = inject(DeliveryAssignmentsService);

  readonly loading = signal(true);
  readonly deliveries = signal<DeliveryAssignment[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.assignmentsService.history(this.page(), 20);
      this.deliveries.set(result.items);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    this.page.update((p) => p + 1);
    await this.load();
  }
}
