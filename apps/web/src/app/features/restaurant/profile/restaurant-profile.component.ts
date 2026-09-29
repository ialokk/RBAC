import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { RestaurantProfileService } from '../data/restaurant-profile.service';
import type { OwnRestaurant } from '../data/models';

@Component({
  selector: 'app-restaurant-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-profile.component.html',
  styleUrl: './restaurant-profile.component.scss',
})
export class RestaurantProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(RestaurantProfileService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly restaurant = signal<OwnRestaurant | null>(null);
  readonly savedMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    cuisines: ['', Validators.required],
    avgPrepTimeMinutes: [30, Validators.required],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const restaurant = await this.profileService.getOwn();
      this.restaurant.set(restaurant);
      this.form.patchValue({
        name: restaurant.name,
        description: restaurant.description ?? '',
        cuisines: restaurant.cuisines.join(', '),
        avgPrepTimeMinutes: restaurant.avgPrepTimeMinutes,
      });
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.savedMessage.set(null);
    try {
      const updated = await this.profileService.updateOwn({
        name: v.name,
        description: v.description || undefined,
        cuisines: v.cuisines.split(',').map((c) => c.trim()).filter(Boolean),
        avgPrepTimeMinutes: v.avgPrepTimeMinutes,
      });
      this.restaurant.set(updated);
      this.savedMessage.set('Profile updated.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleOpen(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) return;
    this.restaurant.set(await this.profileService.setOpenStatus(!restaurant.isOpen));
  }
}
