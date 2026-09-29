import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RestaurantApplicationService } from '../data/restaurant-application.service';
import type { RestaurantApplication } from '../data/models';

@Component({
  selector: 'app-restaurant-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly applicationService = inject(RestaurantApplicationService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly application = signal<RestaurantApplication | null>(null);

  readonly form = this.fb.nonNullable.group({
    ownerName: ['', Validators.required],
    ownerMobile: ['', Validators.required],
    ownerEmail: [''],
    restaurantName: ['', Validators.required],
    cuisines: ['', Validators.required],
    description: [''],
    line1: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: ['', Validators.required],
    accountNumber: ['', Validators.required],
    ifsc: ['', Validators.required],
    accountHolder: ['', Validators.required],
    documentUrls: this.fb.array<string>([]),
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.application.set(await this.applicationService.getOwn());
    } finally {
      this.loading.set(false);
    }
  }

  get documentUrls(): FormArray {
    return this.form.get('documentUrls') as FormArray;
  }

  addDocumentUrl(): void {
    this.documentUrls.push(this.fb.control(''));
  }

  removeDocumentUrl(index: number): void {
    this.documentUrls.removeAt(index);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const application = await this.applicationService.submit({
        ownerDetails: { name: v.ownerName, mobile: v.ownerMobile, email: v.ownerEmail || undefined },
        restaurantDetails: {
          name: v.restaurantName,
          cuisines: v.cuisines.split(',').map((c) => c.trim()).filter(Boolean),
          description: v.description || undefined,
        },
        address: { line1: v.line1, city: v.city, state: v.state, pincode: v.pincode },
        documents: (v.documentUrls as string[]).filter(Boolean).map((url) => ({ type: 'ID_PROOF', url })),
        bankDetails: { accountNumber: v.accountNumber, ifsc: v.ifsc, accountHolder: v.accountHolder },
      });
      this.application.set(application);
    } catch {
      this.errorMessage.set('Could not submit application. Please check your details and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/restaurant/dashboard');
  }
}
