import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DeliveryAssignmentsService } from '../data/delivery-assignments.service';
import type { EarningsSummary } from '../data/models';

@Component({
  selector: 'app-delivery-earnings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './earnings.component.html',
})
export class EarningsComponent implements OnInit {
  private readonly assignmentsService = inject(DeliveryAssignmentsService);

  readonly loading = signal(true);
  readonly summary = signal<EarningsSummary | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.summary.set(await this.assignmentsService.earnings());
    } finally {
      this.loading.set(false);
    }
  }
}
