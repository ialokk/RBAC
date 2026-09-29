import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminRestaurantsService } from '../data/admin-restaurants.service';
import type { AdminRestaurant, RestaurantApplication } from '../data/models';

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Restaurants</h1>
      <div class="tabs">
        <button [class.active]="tab() === 'all'" (click)="setTab('all')">All Restaurants</button>
        <button [class.active]="tab() === 'approvals'" (click)="setTab('approvals')">Pending Approvals</button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (tab() === 'all') {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cuisines</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of restaurants(); track r._id) {
              <tr>
                <td>{{ r.name }}</td>
                <td>{{ r.cuisines.join(', ') }}</td>
                <td>{{ r.status }}</td>
                <td>{{ r.rating?.avg?.toFixed(1) || '—' }}</td>
                <td>
                  @if (r.status === 'APPROVED') {
                    <button (click)="suspend(r)">Suspend</button>
                  } @else {
                    <button (click)="activate(r)">Reactivate</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Restaurant</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (a of applications(); track a._id) {
              <tr>
                <td>{{ a.ownerDetails.name }} ({{ a.ownerDetails.mobile }})</td>
                <td>{{ a.restaurantDetails.name }}</td>
                <td>{{ a.status }}</td>
                <td>
                  @if (a.status === 'PENDING') {
                    <button (click)="approve(a)">Approve</button>
                    <button (click)="reject(a)">Reject</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .tabs button.active {
        font-weight: 600;
        text-decoration: underline;
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
export class AdminRestaurantsComponent implements OnInit {
  private readonly restaurantsService = inject(AdminRestaurantsService);

  readonly tab = signal<'all' | 'approvals'>('all');
  readonly loading = signal(true);
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
    await this.restaurantsService.suspend(r._id);
    await this.load();
  }

  async activate(r: AdminRestaurant): Promise<void> {
    await this.restaurantsService.activate(r._id);
    await this.load();
  }

  async approve(a: RestaurantApplication): Promise<void> {
    await this.restaurantsService.approveApplication(a._id);
    await this.load();
  }

  async reject(a: RestaurantApplication): Promise<void> {
    const reason = window.prompt('Rejection reason?') || 'Not specified';
    await this.restaurantsService.rejectApplication(a._id, reason);
    await this.load();
  }
}
