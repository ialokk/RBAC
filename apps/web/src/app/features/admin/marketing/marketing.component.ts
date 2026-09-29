import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../data/admin.service';
import type { Banner, Offer } from '../data/models';

@Component({
  selector: 'app-admin-marketing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Marketing</h1>
      <div class="tabs">
        <button [class.active]="tab() === 'banners'" (click)="setTab('banners')">Banners</button>
        <button [class.active]="tab() === 'offers'" (click)="setTab('offers')">Offers</button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (tab() === 'banners') {
        <form [formGroup]="bannerForm" (ngSubmit)="createBanner()">
          <input formControlName="title" placeholder="Title" />
          <input formControlName="imageUrl" placeholder="Image URL" />
          <input formControlName="linkUrl" placeholder="Link URL (optional)" />
          <input type="number" formControlName="sortOrder" placeholder="Sort order" />
          <button type="submit" [disabled]="bannerForm.invalid">Add Banner</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Sort</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (b of banners(); track b._id) {
              <tr>
                <td>{{ b.title }}</td>
                <td>{{ b.sortOrder }}</td>
                <td>{{ b.isActive ? 'Yes' : 'No' }}</td>
                <td>
                  <button (click)="toggleBanner(b)">{{ b.isActive ? 'Deactivate' : 'Activate' }}</button>
                  <button (click)="deleteBanner(b)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <form [formGroup]="offerForm" (ngSubmit)="createOffer()">
          <input formControlName="title" placeholder="Title" />
          <input formControlName="description" placeholder="Description (optional)" />
          <input formControlName="code" placeholder="Code (optional)" />
          <button type="submit" [disabled]="offerForm.invalid">Add Offer</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Code</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (o of offers(); track o._id) {
              <tr>
                <td>{{ o.title }}</td>
                <td>{{ o.code || '—' }}</td>
                <td>{{ o.isActive ? 'Yes' : 'No' }}</td>
                <td>
                  <button (click)="toggleOffer(o)">{{ o.isActive ? 'Deactivate' : 'Activate' }}</button>
                  <button (click)="deleteOffer(o)">Delete</button>
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
      form {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
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
      button {
        margin-right: 0.25rem;
      }
    `,
  ],
})
export class AdminMarketingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly tab = signal<'banners' | 'offers'>('banners');
  readonly loading = signal(true);
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
    await this.adminService.createBanner(this.bannerForm.getRawValue());
    this.bannerForm.reset({ sortOrder: 0 });
    await this.load();
  }

  async toggleBanner(b: Banner): Promise<void> {
    await this.adminService.updateBanner(b._id, { isActive: !b.isActive });
    await this.load();
  }

  async deleteBanner(b: Banner): Promise<void> {
    await this.adminService.deleteBanner(b._id);
    await this.load();
  }

  async createOffer(): Promise<void> {
    if (this.offerForm.invalid) return;
    await this.adminService.createOffer(this.offerForm.getRawValue());
    this.offerForm.reset();
    await this.load();
  }

  async toggleOffer(o: Offer): Promise<void> {
    await this.adminService.updateOffer(o._id, { isActive: !o.isActive });
    await this.load();
  }

  async deleteOffer(o: Offer): Promise<void> {
    await this.adminService.deleteOffer(o._id);
    await this.load();
  }
}
