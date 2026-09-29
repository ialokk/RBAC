import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  link?: string;
  tint: string;
}

// Real carousel: native scroll-snap for touch/trackpad, arrows + dots for pointer/keyboard, and
// autoplay that pauses on hover/focus. No carousel library added.
@Component({
  selector: 'app-promo-carousel',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="pc"
      [attr.aria-label]="label()"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (focusin)="pause()"
      (focusout)="resume()"
    >
      <div class="pc__track" #track (scroll)="onScroll()">
        @for (slide of slides(); track slide.id) {
          @if (slide.link) {
            <a class="pc__slide" [style.background]="slide.tint" [routerLink]="slide.link">
              <ng-container *ngTemplateOutlet="body; context: { $implicit: slide }" />
            </a>
          } @else {
            <div class="pc__slide" [style.background]="slide.tint">
              <ng-container *ngTemplateOutlet="body; context: { $implicit: slide }" />
            </div>
          }
        }
      </div>

      @if (slides().length > 1) {
        <button type="button" class="pc__nav pc__nav--prev" (click)="go(-1)" aria-label="Previous offer">‹</button>
        <button type="button" class="pc__nav pc__nav--next" (click)="go(1)" aria-label="Next offer">›</button>

        <div class="pc__dots">
          @for (slide of slides(); track slide.id; let i = $index) {
            <button
              type="button"
              class="pc__dot"
              [class.is-active]="i === index()"
              (click)="scrollTo(i)"
              [attr.aria-label]="'Go to offer ' + (i + 1)"
              [attr.aria-current]="i === index()"
            ></button>
          }
        </div>
      }
    </section>

    <ng-template #body let-slide>
      @if (slide.badge) {
        <span class="badge pc__badge">{{ slide.badge }}</span>
      }
      <strong>{{ slide.title }}</strong>
      <span class="pc__sub">{{ slide.subtitle }}</span>
    </ng-template>
  `,
  styleUrl: './promo-carousel.component.scss',
})
export class PromoCarouselComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly slides = input.required<PromoSlide[]>();
  readonly label = input('Offers');
  readonly autoplayMs = input(5000);

  readonly index = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;

  private get track(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.pc__track');
  }

  ngOnInit(): void {
    if (this.slides().length > 1 && this.autoplayMs() > 0) {
      this.timer = setInterval(() => {
        if (!this.paused) this.go(1);
      }, this.autoplayMs());
    }
  }

  onScroll(): void {
    const track = this.track;
    if (!track) return;
    const width = track.clientWidth || 1;
    this.index.set(Math.round(track.scrollLeft / width));
  }

  go(delta: number): void {
    const total = this.slides().length;
    if (total === 0) return;
    this.scrollTo((this.index() + delta + total) % total);
  }

  scrollTo(index: number): void {
    const track = this.track;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
    this.index.set(index);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
