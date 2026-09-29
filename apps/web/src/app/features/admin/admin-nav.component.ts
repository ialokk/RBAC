import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="scroll-x mb-4" aria-label="Admin Sections">
      <a class="chip" routerLink="/admin/dashboard" routerLinkActive="is-active">Dashboard</a>
      <a class="chip" routerLink="/admin/users" routerLinkActive="is-active">Users</a>
      <a class="chip" routerLink="/admin/restaurants" routerLinkActive="is-active">Restaurants</a>
      <a class="chip" routerLink="/admin/delivery-partners" routerLinkActive="is-active">Delivery Partners</a>
      <a class="chip" routerLink="/admin/orders" routerLinkActive="is-active">Orders</a>
      <a class="chip" routerLink="/admin/payments" routerLinkActive="is-active">Payments</a>
      <a class="chip" routerLink="/admin/coupons" routerLinkActive="is-active">Coupons</a>
      <a class="chip" routerLink="/admin/config" routerLinkActive="is-active">Platform Config</a>
      <a class="chip" routerLink="/admin/marketing" routerLinkActive="is-active">Marketing</a>
      <a class="chip" routerLink="/admin/reports" routerLinkActive="is-active">Reports</a>
      <a class="chip" routerLink="/admin/audit-logs" routerLinkActive="is-active">Audit Logs</a>
    </nav>
  `,
  styles: [
    `
      .mb-4 {
        margin-bottom: 1.5rem;
      }
      .chip {
        text-decoration: none;
      }
      .chip:hover {
        text-decoration: none;
      }
    `,
  ],
})
export class AdminNavComponent {}
