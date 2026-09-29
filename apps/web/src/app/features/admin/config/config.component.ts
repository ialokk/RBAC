import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../data/admin.service';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <app-admin-nav />
      <h1>Platform Config</h1>
      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Delivery charge (paise) <input type="number" formControlName="deliveryChargeMinor" /></label>
          <label>Tax percent <input type="number" formControlName="taxPercent" /></label>
          <label>Min order value (paise) <input type="number" formControlName="minOrderValueMinor" /></label>
          <label>Delivery partner earning per order (paise) <input type="number" formControlName="deliveryPartnerEarningMinor" /></label>
          <label>Commission percent <input type="number" formControlName="commissionPercent" /></label>
          <label>Cancellation window (minutes) <input type="number" formControlName="cancellationWindowMinutes" /></label>
          <button type="submit" [disabled]="form.invalid || saving()">Save</button>
          @if (saved()) {
            <span class="saved">Saved.</span>
          }
        </form>
      }
    </section>
  `,
  styles: [
    `
      form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 420px;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.9rem;
      }
      .saved {
        color: green;
      }
    `,
  ],
})
export class AdminConfigComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly form = this.fb.nonNullable.group({
    deliveryChargeMinor: [0, Validators.required],
    taxPercent: [0, Validators.required],
    minOrderValueMinor: [0, Validators.required],
    deliveryPartnerEarningMinor: [0, Validators.required],
    commissionPercent: [0, Validators.required],
    cancellationWindowMinutes: [0, Validators.required],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const config = await this.adminService.getConfig();
      this.form.patchValue(config);
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.adminService.updateConfig(this.form.getRawValue());
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
