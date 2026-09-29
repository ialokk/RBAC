import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddressesService } from '../data/addresses.service';
import type { Address } from '../data/models';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './addresses.component.html',
})
export class AddressesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly addressesService = inject(AddressesService);

  readonly addresses = signal<Address[]>([]);
  readonly showForm = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    label: ['Home', [Validators.required]],
    line1: ['', [Validators.required]],
    line2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required]],
    isDefault: [false],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.addresses.set((await this.addressesService.list()).items);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      await this.addressesService.create(this.form.getRawValue());
      this.form.reset({ label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false });
      this.showForm.set(false);
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    await this.addressesService.remove(id);
    await this.load();
  }
}
