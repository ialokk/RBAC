import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserRole } from '@rbac/shared-types';
import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ROLE_OPTIONS, RoleSelectorComponent } from '../../../shared/ui/role-selector/role-selector.component';
import type { OtpChannel } from '../../../core/auth/models/auth.models';

type Step = 'request' | 'verify' | 'mismatch';

const RESEND_SECONDS = 30;
const MISMATCH_REDIRECT_MS = 3500;
const MOBILE_PATTERN = /^[0-9+\-\s]{8,16}$/;

// One OTP login screen for all four roles. The role selector only personalises the UI — the
// backend resolves the real role on verify and that is what drives the redirect.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RoleSelectorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<Step>('request');
  readonly channel = signal<OtpChannel>('SMS');
  readonly selectedRole = signal<UserRole>(UserRole.CUSTOMER);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly resendIn = signal(0);

  /** Actual role returned by the backend, kept only when it differs from the UI selection. */
  readonly actualRole = signal<UserRole | null>(null);

  private resendTimer: ReturnType<typeof setInterval> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isEmail = computed(() => this.channel() === 'EMAIL');
  readonly targetLabel = computed(() => (this.isEmail() ? 'Email address' : 'Mobile number'));
  readonly selectedRoleTitle = computed(() => this.titleFor(this.selectedRole()));
  readonly actualRoleTitle = computed(() => this.titleFor(this.actualRole()));

  readonly requestForm = this.fb.nonNullable.group({
    target: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
  });

  readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  get targetControl() {
    return this.requestForm.controls.target;
  }

  get codeControl() {
    return this.verifyForm.controls.code;
  }

  targetError(): string | null {
    const control = this.targetControl;
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) {
      return this.isEmail() ? 'Enter your email address' : 'Enter your mobile number';
    }
    return this.isEmail() ? 'Enter a valid email address' : 'Enter a valid mobile number';
  }

  codeError(): string | null {
    const control = this.codeControl;
    if (!control.touched || control.valid) return null;
    return control.hasError('required') ? 'Enter the 6-digit code' : 'The code must be 6 digits';
  }

  setChannel(channel: OtpChannel): void {
    if (this.channel() === channel) return;
    this.channel.set(channel);
    this.errorMessage.set(null);
    this.targetControl.reset('');
    this.targetControl.setValidators([
      Validators.required,
      channel === 'EMAIL' ? Validators.email : Validators.pattern(MOBILE_PATTERN),
    ]);
    this.targetControl.updateValueAndValidity();
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
  }

  async submitRequest(): Promise<void> {
    if (this.loading()) return;
    this.requestForm.markAllAsTouched();
    if (this.requestForm.invalid) return;

    const target = this.requestForm.getRawValue().target.trim();
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.requestOtp(target, this.channel());
      this.step.set('verify');
      this.infoMessage.set(`We sent a 6-digit code to ${target}`);
      this.startResendCountdown();
    } catch (err) {
      this.errorMessage.set(this.messageFor(err, 'Could not send the code. Check the details and try again.'));
    } finally {
      this.loading.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    if (this.resendIn() > 0 || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.requestOtp(this.requestForm.getRawValue().target.trim(), this.channel());
      this.infoMessage.set('A new code is on its way.');
      this.startResendCountdown();
    } catch (err) {
      this.errorMessage.set(this.messageFor(err, 'Could not resend the code. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }

  async submitVerify(): Promise<void> {
    if (this.loading()) return;
    this.verifyForm.markAllAsTouched();
    if (this.verifyForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const target = this.requestForm.getRawValue().target.trim();
      const { code } = this.verifyForm.getRawValue();
      const user = await this.authService.verifyOtp(target, code);
      this.stopResendCountdown();

      // Authorization comes from the server's resolved role, never from the selector. A mismatch
      // is surfaced honestly and still lands the user in the area they actually have access to.
      if (user.role !== this.selectedRole()) {
        this.actualRole.set(user.role);
        this.step.set('mismatch');
        this.redirectTimer = setTimeout(() => void this.goToActualHome(), MISMATCH_REDIRECT_MS);
        return;
      }

      await this.router.navigateByUrl(this.authService.homePathForRole(user.role));
    } catch (err) {
      this.errorMessage.set(this.messageFor(err, 'That code is invalid or has expired. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }

  async goToActualHome(): Promise<void> {
    const role = this.actualRole();
    if (!role) return;
    this.clearRedirectTimer();
    await this.router.navigateByUrl(this.authService.homePathForRole(role));
  }

  backToRequest(): void {
    this.step.set('request');
    this.verifyForm.reset({ code: '' });
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.stopResendCountdown();
  }

  private titleFor(role: UserRole | null): string {
    return ROLE_OPTIONS.find((option) => option.role === role)?.title ?? '';
  }

  private startResendCountdown(): void {
    this.stopResendCountdown();
    this.resendIn.set(RESEND_SECONDS);
    this.resendTimer = setInterval(() => {
      this.resendIn.update((value) => Math.max(0, value - 1));
      if (this.resendIn() === 0) this.stopResendCountdown();
    }, 1000);
  }

  private stopResendCountdown(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  private clearRedirectTimer(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

  private messageFor(err: unknown, fallback: string): string {
    if (err instanceof Object && 'error' in err) {
      const message = (err as { error?: { message?: string } }).error?.message;
      if (message) return message;
    }
    return fallback;
  }

  ngOnDestroy(): void {
    this.stopResendCountdown();
    this.clearRedirectTimer();
  }
}
