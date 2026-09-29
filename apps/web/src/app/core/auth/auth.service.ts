import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '@rbac/shared-types';
import { APP_CONFIG } from '../config/app-config.token';
import type {
  AuthTokens,
  AuthUser,
  OtpChannel,
  VerifyOtpResponse,
} from './models/auth.models';
import { TokenStorageService } from './token-storage.service';

const ROLE_HOME_PATH: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/customer',
  [UserRole.RESTAURANT]: '/restaurant',
  [UserRole.DELIVERY_PARTNER]: '/delivery',
  [UserRole.ADMIN]: '/admin',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly currentUserSignal = signal<AuthUser | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed(() => this.currentUserSignal()?.role ?? null);

  homePathForRole(role: UserRole): string {
    return ROLE_HOME_PATH[role];
  }

  requestOtp(target: string, channel: OtpChannel): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.config.apiBaseUrl}/auth/otp/request`, {
        target,
        channel,
        purpose: 'LOGIN',
      }),
    );
  }

  async verifyOtp(target: string, code: string): Promise<AuthUser> {
    const deviceId = this.tokenStorage.getOrCreateDeviceId();
    const response = await firstValueFrom(
      this.http.post<VerifyOtpResponse>(`${this.config.apiBaseUrl}/auth/otp/verify`, {
        target,
        code,
        deviceId,
      }),
    );
    this.tokenStorage.setTokens(response.tokens);
    this.currentUserSignal.set(response.user);
    return response.user;
  }

  async refreshTokens(): Promise<AuthTokens> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${this.config.apiBaseUrl}/auth/refresh`, { refreshToken }),
    );
    this.tokenStorage.setTokens(tokens);
    return tokens;
  }

  async loadCurrentUser(): Promise<void> {
    if (!this.tokenStorage.getAccessToken()) {
      return;
    }
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${this.config.apiBaseUrl}/auth/me`));
      this.currentUserSignal.set(user);
    } catch {
      this.clearSession();
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post<void>(`${this.config.apiBaseUrl}/auth/logout`, { refreshToken }));
      } catch {
        // Best-effort server-side revocation — session is cleared client-side regardless.
      }
    }
    this.clearSession();
  }

  clearSession(): void {
    this.tokenStorage.clearTokens();
    this.currentUserSignal.set(null);
  }
}
