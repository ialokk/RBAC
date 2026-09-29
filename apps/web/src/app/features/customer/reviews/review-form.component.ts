import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReviewsService } from '../data/reviews.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-form.component.html',
})
export class ReviewFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reviewsService = inject(ReviewsService);

  readonly ratings = [1, 2, 3, 4, 5];
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: [''],
    deliveryPartnerRating: [5, [Validators.min(1), Validators.max(5)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    const orderId = this.route.snapshot.paramMap.get('id')!;
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.reviewsService.create({ orderId, ...this.form.getRawValue() });
      await this.router.navigateByUrl(`/customer/orders/${orderId}`);
    } catch {
      this.errorMessage.set('Could not submit review. It may already have been reviewed.');
    } finally {
      this.submitting.set(false);
    }
  }
}
