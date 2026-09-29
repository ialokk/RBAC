import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminService } from '../data/admin.service';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container scroll-x">
      <app-admin-nav />
      
      <div class="mb-4">
        <h1 class="text-xl">Platform Config</h1>
        <p class="text-secondary text-sm">Manage global platform settings and parameters.</p>
      </div>

      @if (loading()) {
        <div class="skeleton-form">
          <div class="skeleton" style="width: 100%; height: 60px;"></div>
          <div class="skeleton" style="width: 100%; height: 60px;"></div>
          <div class="skeleton" style="width: 100%; height: 60px;"></div>
          <div class="skeleton" style="width: 100%; height: 60px;"></div>
          <div class="skeleton" style="width: 100%; height: 60px;"></div>
          <div class="skeleton" style="width: 120px; height: 40px; margin-top: 1rem;"></div>
        </div>
      } @else {
        <div class="form-card">
          <form [formGroup]="form" (ngSubmit)="submit()" class="config-form">
            
            <div class="form-row">
              <div class="form-group">
                <label class="label">Delivery Charge (paise)</label>
                <input class="field" type="number" formControlName="deliveryChargeMinor" placeholder="e.g. 5000" />
                <span class="text-secondary text-sm mt-1">Default fee applied to orders</span>
              </div>

              <div class="form-group">
                <label class="label">Tax Percent</label>
                <input class="field" type="number" formControlName="taxPercent" placeholder="e.g. 5" />
                <span class="text-secondary text-sm mt-1">Applied to subtotal before delivery</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="label">Min Order Value (paise)</label>
                <input class="field" type="number" formControlName="minOrderValueMinor" placeholder="e.g. 15000" />
                <span class="text-secondary text-sm mt-1">Minimum amount required to place an order</span>
              </div>

              <div class="form-group">
                <label class="label">Partner Earning Per Order (paise)</label>
                <input class="field" type="number" formControlName="deliveryPartnerEarningMinor" placeholder="e.g. 4000" />
                <span class="text-secondary text-sm mt-1">Base payout to delivery partners</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="label">Commission Percent</label>
                <input class="field" type="number" formControlName="commissionPercent" placeholder="e.g. 15" />
                <span class="text-secondary text-sm mt-1">Platform fee taken from restaurant payouts</span>
              </div>

              <div class="form-group">
                <label class="label">Cancellation Window (minutes)</label>
                <input class="field" type="number" formControlName="cancellationWindowMinutes" placeholder="e.g. 5" />
                <span class="text-secondary text-sm mt-1">Time allowed for customer cancellations</span>
              </div>
            </div>

            <div class="form-actions mt-4 border-t pt-4">
              @if (saved()) {
                <span class="text-success text-sm font-medium saved-msg">Settings saved successfully</span>
              }
              <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Saving...' : 'Save Configuration' }}
              </button>
            </div>
          </form>
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
        max-width: 800px;
      }
      .config-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary, #111);
      }
      .form-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 1rem;
      }
      .mt-1 { margin-top: 0.25rem; }
      .mt-4 { margin-top: 1rem; }
      .pt-4 { padding-top: 1rem; }
      .border-t { border-top: 1px solid var(--border, #e5e5e5); }
      .mb-4 { margin-bottom: 1.5rem; }
      .text-xl { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem 0; }
      .text-sm { font-size: 0.875rem; }
      .text-secondary { color: var(--text-secondary, #666); }
      .text-success { color: var(--success, #10b981); }
      .font-medium { font-weight: 500; }
      
      .saved-msg {
        animation: fadeOut 3s forwards;
      }
      
      @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      .skeleton-form {
        max-width: 800px;
        background: #fff;
        border: 1px solid var(--border, #e5e5e5);
        border-radius: var(--r-md, 8px);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
      setTimeout(() => this.saved.set(false), 3000);
    } finally {
      this.saving.set(false);
    }
  }
}
