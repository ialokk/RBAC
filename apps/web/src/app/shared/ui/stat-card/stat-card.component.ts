import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

// KPI tile used by the restaurant, delivery and admin dashboards. `highlight` marks a metric that
// needs action so it stands out from purely informational tiles.
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [RouterLink, IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (link()) {
      <a class="stat card card-interactive" [class.is-highlight]="highlight()" [routerLink]="link()">
        <ng-container *ngTemplateOutlet="content" />
      </a>
    } @else {
      <div class="stat card" [class.is-highlight]="highlight()">
        <ng-container *ngTemplateOutlet="content" />
      </div>
    }

    <ng-template #content>
      <span class="stat__top">
        <span class="stat__label">{{ label() }}</span>
        @if (icon()) {
          <span class="stat__icon"><app-icon [name]="icon()" [size]="16" /></span>
        }
      </span>
      <strong class="stat__value">{{ value() }}</strong>
      @if (hint()) {
        <span class="stat__hint">{{ hint() }}</span>
      }
    </ng-template>
  `,
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly icon = input('');
  readonly link = input('');
  readonly highlight = input(false);
}
