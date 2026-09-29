import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Shared top nav reused by every admin page — mirrors the lightweight per-page inline-nav
// convention already used by the restaurant dashboard, just factored out once since the admin
// area has many more sibling pages than any other feature area.
@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/users" routerLinkActive="active">Users</a>
      <a routerLink="/admin/restaurants" routerLinkActive="active">Restaurants</a>
      <a routerLink="/admin/delivery-partners" routerLinkActive="active">Delivery Partners</a>
      <a routerLink="/admin/orders" routerLinkActive="active">Orders</a>
      <a routerLink="/admin/payments" routerLinkActive="active">Payments</a>
      <a routerLink="/admin/coupons" routerLinkActive="active">Coupons</a>
      <a routerLink="/admin/config" routerLinkActive="active">Platform Config</a>
      <a routerLink="/admin/marketing" routerLinkActive="active">Marketing</a>
      <a routerLink="/admin/reports" routerLinkActive="active">Reports</a>
      <a routerLink="/admin/audit-logs" routerLinkActive="active">Audit Logs</a>
    </nav>
  `,
  styles: [
    `
      .admin-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 0.75rem 0;
        margin-bottom: 1rem;
        border-bottom: 1px solid #ddd;
      }
      .admin-nav a {
        text-decoration: none;
        color: #333;
        font-size: 0.9rem;
      }
      .admin-nav a.active {
        font-weight: 600;
        color: #1a1a1a;
        text-decoration: underline;
      }
    `,
  ],
})
export class AdminNavComponent {}
