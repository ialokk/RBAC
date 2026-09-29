import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminCouponsService } from '../data/admin-coupons.service';
import type { Coupon } from '../data/models';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Coupons</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <input formControlName="code" placeholder="Code" />
        <select formControlName="discountType">
          <option value="PERCENT">Percent</option>
          <option value="FLAT">Flat (paise)</option>
        </select>
        <input type="number" formControlName="value" placeholder="Value" />
        <input type="number" formControlName="minOrderValue" placeholder="Min order value (paise)" />
        <input type="date" formControlName="validFrom" />
        <input type="date" formControlName="validTo" />
        <button type="submit" [disabled]="form.invalid">Create Coupon</button>
      </form>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min Order</th>
              <th>Valid</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of coupons(); track c._id) {
              <tr>
                <td>{{ c.code }}</td>
                <td>{{ c.discountType === 'PERCENT' ? c.value + '%' : (c.value / 100).toFixed(2) }}</td>
                <td>{{ (c.minOrderValue / 100).toFixed(2) }}</td>
                <td>{{ c.validFrom | date: 'shortDate' }} – {{ c.validTo | date: 'shortDate' }}</td>
                <td>{{ c.isActive ? 'Yes' : 'No' }}</td>
                <td>
                  <button (click)="toggleActive(c)">{{ c.isActive ? 'Deactivate' : 'Activate' }}</button>
                  <button (click)="remove(c)">Delete</button>
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
      form {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
        align-items: center;
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
export class AdminCouponsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly couponsService = inject(AdminCouponsService);

  readonly loading = signal(true);
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
  }

  async toggleActive(c: Coupon): Promise<void> {
    await this.couponsService.update(c._id, { isActive: !c.isActive });
    await this.load();
  }

  async remove(c: Coupon): Promise<void> {
    await this.couponsService.remove(c._id);
    await this.load();
  }
}
