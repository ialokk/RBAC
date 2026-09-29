import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserRole } from '@rbac/shared-types';
import { AuthService } from '../auth/auth.service';
import { SocketService } from '../realtime/socket.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { navForRole, primaryNavForRole, roleLabel } from './nav-items';

// Single authenticated shell for all four roles — header, role-aware navigation and logout live
// here exactly once instead of being reimplemented per dashboard.
// CUSTOMER/DELIVERY are mobile-first (bottom nav); RESTAURANT/ADMIN get a collapsible sidebar.
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly push = inject(PushNotificationsService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;
  readonly role = this.auth.role;
  readonly roleLabel = computed(() => roleLabel(this.role()));
  readonly navItems = computed(() => navForRole(this.role()));
  readonly bottomNavItems = computed(() => primaryNavForRole(this.role()));

  // Restaurant/Admin are data-dense back-office surfaces; customer/delivery are field/mobile use.
  readonly usesSidebar = computed(() => {
    const role = this.role();
    return role === UserRole.RESTAURANT || role === UserRole.ADMIN;
  });

  readonly sidebarOpen = signal(false);
  readonly loggingOut = signal(false);

  readonly initials = computed(() => {
    const name = this.user()?.name?.trim();
    if (name) {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
    }
    return this.roleLabel().slice(0, 1).toUpperCase() || '?';
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      this.socket.disconnectAll();
      this.push.reset();
      await this.auth.logout();
    } finally {
      this.loggingOut.set(false);
      await this.router.navigateByUrl('/auth');
    }
  }
}
