import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserRole } from '@rbac/shared-types';
import { AuthService } from './auth.service';
import { APP_CONFIG } from '../config/app-config.token';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://test/api/v1', socketUrl: 'http://test' } },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps each role to its expected home path', () => {
    expect(service.homePathForRole(UserRole.CUSTOMER)).toBe('/customer');
    expect(service.homePathForRole(UserRole.RESTAURANT)).toBe('/restaurant');
    expect(service.homePathForRole(UserRole.DELIVERY_PARTNER)).toBe('/delivery');
    expect(service.homePathForRole(UserRole.ADMIN)).toBe('/admin');
  });

  it('starts unauthenticated with no current user', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('verifyOtp stores tokens and sets the current user on success', async () => {
    const verifyPromise = service.verifyOtp('+919876543210', '123456');

    const req = httpMock.expectOne('http://test/api/v1/auth/otp/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      target: '+919876543210',
      code: '123456',
      deviceId: service['tokenStorage'].getOrCreateDeviceId(),
    });

    req.flush({
      tokens: { accessToken: 'access-1', refreshToken: 'refresh-1' },
      user: { id: 'u1', role: UserRole.CUSTOMER, name: 'Test', status: 'ACTIVE' },
    });

    const user = await verifyPromise;
    expect(user.role).toBe(UserRole.CUSTOMER);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe(UserRole.CUSTOMER);
  });
});
