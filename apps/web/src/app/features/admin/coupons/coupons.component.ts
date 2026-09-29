import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminCouponsService } from '../data/admin-coupons.service';
import type { Coupon } from '../data/models';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent, StatusBadgeComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Coupons</h1>
        <p class="text-secondary text-sm">Create and manage promotional discount codes.</p>
      </div>

      <div class="form-card mb-4">
        <h2 class="text-lg mb-4">Create New Coupon</h2>
        <form [formGroup]="form" (ngSubmit)="submit()" class="coupon-form">
          <div class="form-group">
            <label class="label">Code</label>
            <input class="field" formControlName="code" placeholder="e.g. WELCOME50" />
          </div>
          <div class="form-group">
            <label class="label">Discount Type</label>
            <select class="field" formControlName="discountType">
              <option value="PERCENT">Percent (%)</option>
              <option value="FLAT">Flat Amount (paise)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">Value</label>
            <input class="field" type="number" formControlName="value" placeholder="e.g. 50" />
          </div>
          <div class="form-group">
            <label class="label">Min Order Value (paise)</label>
            <input class="field" type="number" formControlName="minOrderValue" placeholder="e.g. 20000" />
          </div>
          <div class="form-group">
            <label class="label">Valid From</label>
            <input class="field" type="date" formControlName="validFrom" />
          </div>
          <div class="form-group">
            <label class="label">Valid To</label>
            <input class="field" type="date" formControlName="validTo" />
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || actionLoading()">
              {{ actionLoading() ? 'Creating...' : 'Create Coupon' }}
            </button>
          </div>
        </form>
      </div>

      @if (loading()) {
        <div class="skeleton-table">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton" style="width: 20%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
            <div class="skeleton" style="width: 25%; height: 20px;"></div>
            <div class="skeleton" style="width: 10%; height: 20px;"></div>
            <div class="skeleton" style="width: 15%; height: 20px;"></div>
          </div>
        </div>
      } @else {
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Valid</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of coupons(); track c._id) {
                <tr>
                  <td class="font-medium">{{ c.code }}</td>
                  <td>{{ c.discountType === 'PERCENT' ? c.value + '%' : (c.value | money) }}</td>
                  <td>{{ c.minOrderValue | money }}</td>
                  <td class="text-secondary text-sm">{{ c.validFrom | date: 'shortDate' }} – {{ c.validTo | date: 'shortDate' }}</td>
                  <td>
                    <app-status-badge [label]="c.isActive ? 'ACTIVE' : 'INACTIVE'" [tone]="c.isActive ? 'success' : 'neutral'" />
                  </td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (c.isActive) {
                        <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === c._id" (click)="toggleActive(c)">
                          {{ actionLoading() === c._id ? 'Saving...' : 'Deactivate' }}
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline" [disabled]="actionLoading() === c._id" (click)="toggleActive(c)">
                          {{ actionLoading() === c._id ? 'Saving...' : 'Activate' }}
                        </button>
                      }
                      <button class="btn btn-sm btn-outline-danger" [disabled]="actionLoading() === 'del_' + c._id" (click)="remove(c)">
                        {{ actionLoading() === 'del_' + c._id ? 'Deleting...' : 'Delete' }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-8 text-secondary">
                    No coupons found.
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
      .form-card {
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        padding: 1.5rem;
      }
      .coupon-form {
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
        grid-column: 1 / -1;
        justify-content: flex-end;
        margin-top: 0.5rem;
      }
      .table-container {
        overflow-x: auto;
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
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
export class AdminCouponsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly couponsService = inject(AdminCouponsService);

  readonly loading = signal(true);
  readonly actionLoading = signal<string | null>(null);
  readonly coupons = signal<Coupon[]>([]);

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    discountType: ['PERCENT' as 'PERCENT' | 'FLAT', Validators.required],
    value: [10, Validators.required],
    minOrderValue: [0, Validators.required],
    validFrom: ['', Validators.required],
    validTo: ['', Validators.required],
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.coupons.set((await this.couponsService.list()).items);
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.actionLoading.set('create');
    try {
      const value = this.form.getRawValue();
      await this.couponsService.create({
        code: value.code,
        discountType: value.discountType,
        value: value.value,
        minOrderValue: value.minOrderValue,
        validFrom: new Date(value.validFrom).toISOString(),
        validTo: new Date(value.validTo).toISOString(),
      });
      this.form.reset({ discountType: 'PERCENT', value: 10, minOrderValue: 0 });
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async toggleActive(c: Coupon): Promise<void> {
    this.actionLoading.set(c._id);
    try {
      await this.couponsService.update(c._id, { isActive: !c.isActive });
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }

  async remove(c: Coupon): Promise<void> {
    if (!window.confirm(`Are you sure you want to delete coupon ${c.code}?`)) {
      return;
    }
    this.actionLoading.set('del_' + c._id);
    try {
      await this.couponsService.remove(c._id);
      await this.load();
    } finally {
      this.actionLoading.set(null);
    }
  }
}
