import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../core/auth/auth.service';
import type { OtpChannel } from '../../../core/auth/models/auth.models';

type Step = 'request' | 'verify';

// Single OTP login flow shared by all four roles — the backend resolves the real role on verify.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<Step>('request');
  readonly channel = signal<OtpChannel>('SMS');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly requestForm = this.fb.nonNullable.group({
    target: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  setChannel(channel: OtpChannel): void {
    this.channel.set(channel);
    this.requestForm.reset();
  }

  async submitRequest(): Promise<void> {
    if (this.requestForm.invalid) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.requestOtp(this.requestForm.getRawValue().target, this.channel());
      this.step.set('verify');
    } catch {
      this.errorMessage.set('Could not send OTP. Check the value and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitVerify(): Promise<void> {
    if (this.verifyForm.invalid) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const target = this.requestForm.getRawValue().target;
      const code = this.verifyForm.getRawValue().code;
      const user = await this.authService.verifyOtp(target, code);
      await this.router.navigateByUrl(this.authService.homePathForRole(user.role));
    } catch {
      this.errorMessage.set('Invalid or expired OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  backToRequest(): void {
    this.step.set('request');
    this.verifyForm.reset();
  }
}
