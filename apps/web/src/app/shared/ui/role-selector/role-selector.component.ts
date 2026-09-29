import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UserRole } from '@rbac/shared-types';
import { IconComponent } from '../icon/icon.component';

export interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { role: UserRole.CUSTOMER, title: 'Customer', description: 'Order food & track delivery', icon: 'user' },
  { role: UserRole.RESTAURANT, title: 'Restaurant', description: 'Manage menu & orders', icon: 'store' },
  { role: UserRole.DELIVERY_PARTNER, title: 'Delivery Partner', description: 'Accept & deliver orders', icon: 'bike' },
  { role: UserRole.ADMIN, title: 'Admin', description: 'Operate the platform', icon: 'shield' },
];

// Presentational role picker. The choice is a UI preference that tailors copy and the post-login
// landing hint only — it is never sent as an authorization claim; the backend decides the real role.
@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="roles" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options; track option.role) {
        <button
          type="button"
          role="radio"
          class="role"
          [class.is-selected]="selected() === option.role"
          [attr.aria-checked]="selected() === option.role"
          [disabled]="disabled()"
          (click)="selectedChange.emit(option.role)"
        >
          <span class="role__icon"><app-icon [name]="option.icon" [size]="20" /></span>
          <span class="role__text">
            <strong>{{ option.title }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </button>
      }
    </div>
  `,
  styleUrl: './role-selector.component.scss',
})
export class RoleSelectorComponent {
  readonly options = ROLE_OPTIONS;
  readonly selected = input<UserRole | null>(null);
  readonly disabled = input(false);
  readonly label = input('Select your role');
  readonly selectedChange = output<UserRole>();
}
