import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { RestaurantOrdersService } from '../data/restaurant-orders.service';
import type { DashboardSummary } from '../data/models';

@Component({
  selector: 'app-restaurant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly ordersService = inject(RestaurantOrdersService);

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.summary.set(await this.ordersService.summary());
    } finally {
      this.loading.set(false);
    }
  }
}
