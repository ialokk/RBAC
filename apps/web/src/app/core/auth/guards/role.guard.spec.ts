import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserRole } from '@rbac/shared-types';
import { roleGuard } from './role.guard';
import { AuthService } from '../auth.service';

describe('roleGuard', () => {
  function setup(currentRole: UserRole | null) {
    const authServiceStub = { role: () => currentRole };
    const urlTree = {} as ReturnType<Router['createUrlTree']>;
    const routerStub = { createUrlTree: () => urlTree };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    return { urlTree };
  }

  it('allows activation when the current role is in the allowed list', () => {
    setup(UserRole.CUSTOMER);
    const guard = roleGuard([UserRole.CUSTOMER, UserRole.ADMIN]);
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /auth when the role is not allowed', () => {
    const { urlTree } = setup(UserRole.CUSTOMER);
    const guard = roleGuard([UserRole.ADMIN]);
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).toBe(urlTree);
  });

  it('redirects to /auth when there is no authenticated role', () => {
    setup(null);
    const guard = roleGuard([UserRole.ADMIN]);
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).not.toBe(true);
  });
});
