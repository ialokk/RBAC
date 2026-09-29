import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminService } from '../data/admin.service';
import type { Banner, Offer } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-marketing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Marketing</h1>
        <p class="text-secondary text-sm">Manage banners and promotional offers.</p>
      </div>

      <div class="tabs mb-4">
        <button class="btn btn-outline" [class.btn-active]="tab() === 'banners'" (click)="setTab('banners')">Banners</button>
        <button class="btn btn-outline" [class.btn-active]="tab() === 'offers'" (click)="setTab('offers')">Offers</button>
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
          </div>
        </div>
      } @else if (tab() === 'banners') {
        <div class="form-card mb-4">
          <h2 class="text-lg mb-4">Add New Banner</h2>
          <form [formGroup]="bannerForm" (ngSubmit)="createBanner()" class="marketing-form">
            <div class="form-group">
              <label class="label">Title</label>
              <input class="field" formControlName="title" placeholder="Banner Title" />
            </div>
            <div class="form-group">
              <label class="label">Image URL</label>
              <input class="field" formControlName="imageUrl" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label class="label">Link URL (Optional)</label>
              <input class="field" formControlName="linkUrl" placeholder="/path" />
            </div>
            <div class="form-group">
              <label class="label">Sort Order</label>
              <input class="field" type="number" formControlName="sortOrder" placeholder="0" />
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" [disabled]="bannerForm.invalid || actionLoading()">
                {{ actionLoading() ? 'Adding...' : 'Add Banner' }}
              </button>
            </div>
          </form>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (b of banners(); track b._id) {
                <tr>
                  <td>
                    <div class="banner-preview">
                      <img [src]="b.imageUrl" alt="" class="banner-img" />
                      <div class="font-medium">{{ b.title }}</div>
                    </div>
                  </td>
                  <td>{{ b.sortOrder }}</td>
                  <td>
                    <app-status-badge [label]="b.isActive ? 'ACTIVE' : 'INACTIVE'" [tone]="b.isActive ? 'success' : 'neutral'" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (b.isActive) {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === b._id" (click)="toggleBanner(b)">
                           {{ actionLoading() === b._id ? 'Saving...' : 'Deactivate' }}
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === b._id" (click)="toggleBanner(b)">
                           {{ actionLoading() === b._id ? 'Saving...' : 'Activate' }}
                        </button>
                      }
                      <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === 'del_' + b._id" (click)="deleteBanner(b)">
                         {{ actionLoading() === 'del_' + b._id ? 'Deleting...' : 'Delete' }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-secondary">
                    No banners found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="form-card mb-4">
          <h2 class="text-lg mb-4">Add New Offer</h2>
          <form [formGroup]="offerForm" (ngSubmit)="createOffer()" class="marketing-form">
            <div class="form-group">
              <label class="label">Title</label>
              <input class="field" formControlName="title" placeholder="Offer Title" />
            </div>
            <div class="form-group">
              <label class="label">Description (Optional)</label>
              <input class="field" formControlName="description" placeholder="Description" />
            </div>
            <div class="form-group">
              <label class="label">Code (Optional)</label>
              <input class="field" formControlName="code" placeholder="e.g. GET50" />
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" [disabled]="offerForm.invalid || actionLoading()">
                {{ actionLoading() ? 'Adding...' : 'Add Offer' }}
              </button>
            </div>
          </form>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Offer Title</th>
                <th>Code</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (o of offers(); track o._id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ o.title }}</div>
                    @if (o.description) {
                      <div class="text-secondary text-sm">{{ o.description }}</div>
                    }
                  </td>
                  <td class="font-medium">{{ o.code || '—' }}</td>
                  <td>
                    <app-status-badge [label]="o.isActive ? 'ACTIVE' : 'INACTIVE'" [tone]="o.isActive ? 'success' : 'neutral'" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (o.isActive) {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === o._id" (click)="toggleOffer(o)">
                           {{ actionLoading() === o._id ? 'Saving...' : 'Deactivate' }}
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === o._id" (click)="toggleOffer(o)">
                           {{ actionLoading() === o._id ? 'Saving...' : 'Activate' }}
                        </button>
                      }
                      <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === 'del_' + o._id" (click)="deleteOffer(o)">
                         {{ actionLoading() === 'del_' + o._id ? 'Deleting...' : 'Delete' }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-secondary">
                    No offers found.
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
      
      .form-card {
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        padding: 1.5rem;
      }
      .marketing-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        align-items: flex-end;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary, #666);
      }
      .form-actions {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        grid-column: 1 / -1;
        margin-top: 0.5rem;
      }
      
      .table-container {
        overflow-x: auto;
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
      }
      
      .banner-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .banner-img {
        width: 60px;
        height: 40px;
        object-fit: cover;
        border-radius: var(--r-sm, 4px);
        background: #eee;
      }
      
      .mb-4 { margin-bottom: 1.5rem; }
      .text-xl { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem 0; }
      .text-lg { font-size: 1.125rem; font-weight: 600; margin: 0; }
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
    `,
  ],
})
export class AdminMarketingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly tab = signal<'banners' | 'offers'>('banners');
  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly banners = signal<Banner[]>([]);
  readonly offers = signal<Offer[]>([]);

  readonly bannerForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    imageUrl: ['', Validators.required],
    linkUrl: [''],
    sortOrder: [0],
  });

  readonly offerForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    code: [''],
  });

  ngOnInit(): void {
    void this.load();
  }

  setTab(tab: 'banners' | 'offers'): void {
    this.tab.set(tab);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.tab() === 'banners') {
        this.banners.set((await this.adminService.listBanners()).items);
      } else {
        this.offers.set((await this.adminService.listOffers()).items);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async createBanner(): Promise<void> {
    if (this.bannerForm.invalid) return;
    this.actionLoading.set('create_banner');
    try {
      await this.adminService.createBanner(this.bannerForm.getRawValue());
      this.bannerForm.reset({ sortOrder: 0 });
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async toggleBanner(b: Banner): Promise<void> {
    this.actionLoading.set(b._id);
    try {
      await this.adminService.updateBanner(b._id, { isActive: !b.isActive });
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async deleteBanner(b: Banner): Promise<void> {
    if (!window.confirm(`Are you sure you want to delete banner "${b.title}"?`)) {
      return;
    }
    this.actionLoading.set('del_' + b._id);
    try {
      await this.adminService.deleteBanner(b._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async createOffer(): Promise<void> {
    if (this.offerForm.invalid) return;
    this.actionLoading.set('create_offer');
    try {
      await this.adminService.createOffer(this.offerForm.getRawValue());
      this.offerForm.reset();
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async toggleOffer(o: Offer): Promise<void> {
    this.actionLoading.set(o._id);
    try {
      await this.adminService.updateOffer(o._id, { isActive: !o.isActive });
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async deleteOffer(o: Offer): Promise<void> {
    if (!window.confirm(`Are you sure you want to delete offer "${o.title}"?`)) {
      return;
    }
    this.actionLoading.set('del_' + o._id);
    try {
      await this.adminService.deleteOffer(o._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
