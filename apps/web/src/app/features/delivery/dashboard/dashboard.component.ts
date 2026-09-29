import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryApplicationService } from '../data/delivery-application.service';
import { DeliveryAssignmentsService } from '../data/delivery-assignments.service';
import { LocationService, type LocationWatchId } from '../../../core/location/location.service';
import { SocketService } from '../../../core/realtime/socket.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent, toneForStatus } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { deliveryStatusLabel } from '../data/delivery-status-label';
import type { DeliveryAssignment, EarningsSummary } from '../data/models';
import { RouterLink } from '@angular/router';

const ACTIVE_STATUSES: DeliveryAssignment['status'][] = ['ACCEPTED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'];

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    StatCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MoneyPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly applicationService = inject(DeliveryApplicationService);
  private readonly assignmentsService = inject(DeliveryAssignmentsService);
  private readonly locationService = inject(LocationService);
  private readonly socketService = inject(SocketService);

  private pollHandle?: ReturnType<typeof setInterval>;
  private watchId?: LocationWatchId;

  readonly statusLabel = deliveryStatusLabel;
  readonly statusTone = toneForStatus;

  readonly loading = signal(true);
  readonly availability = signal<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('OFFLINE');
  readonly availableAssignments = signal<DeliveryAssignment[]>([]);
  readonly currentAssignment = signal<DeliveryAssignment | null>(null);

  readonly earnings = signal<EarningsSummary | null>(null);
  readonly recentHistory = signal<DeliveryAssignment[]>([]);

  readonly otpCode = signal('');
  readonly actionError = signal<string | null>(null);
  readonly processingAction = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const application = await this.applicationService.getOwn();
      this.availability.set(application?.availability ?? 'OFFLINE');
      await this.refresh();
    } finally {
      this.loading.set(false);
    }

    this.pollHandle = setInterval(() => this.refresh(), 15000);

    const socket = this.socketService.connectNamespace('/tracking');
    socket.on('assignment:offered', () => this.refresh());
    socket.on('assignment:cancelled', () => this.refresh());
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.stopLocationTracking();
    this.socketService.disconnectNamespace('/tracking');
  }

  async refresh(): Promise<void> {
    try {
      const [current, earnings, history] = await Promise.all([
        this.assignmentsService.current(),
        this.assignmentsService.earnings(),
        this.assignmentsService.history(1, 5)
      ]);

      this.currentAssignment.set(current);
      this.earnings.set(earnings);
      this.recentHistory.set(history.items);
      this.updateLocationTracking(current);

      if (!current && this.availability() === 'AVAILABLE') {
        const available = await this.assignmentsService.listAvailable();
        this.availableAssignments.set(available.items);
      } else {
        this.availableAssignments.set([]);
      }
    } catch (err) {
      // Handle silently for poll
    }
  }

  async changeAvailability(value: 'AVAILABLE' | 'BUSY' | 'OFFLINE'): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set('availability');
    try {
      await this.assignmentsService.setAvailability(value);
      this.availability.set(value);
      await this.refresh();
    } finally {
      this.processingAction.set(null);
    }
  }

  private updateLocationTracking(assignment: DeliveryAssignment | null): void {
    const isActive = !!assignment && ACTIVE_STATUSES.includes(assignment.status);
    if (isActive && this.watchId === undefined) {
      this.watchId = this.locationService.watchPosition((position) => {
        this.assignmentsService.sendLocationHeartbeat(position.lat, position.lng).catch(() => undefined);
      });
    } else if (!isActive) {
      this.stopLocationTracking();
    }
  }

  private stopLocationTracking(): void {
    if (this.watchId !== undefined) {
      this.locationService.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }

  mapsUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  async accept(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      await this.assignmentsService.accept(assignment.id);
      await this.refresh();
    } finally {
      this.processingAction.set(null);
    }
  }

  async decline(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      await this.assignmentsService.decline(assignment.id);
      await this.refresh();
    } finally {
      this.processingAction.set(null);
    }
  }

  async arrivedAtRestaurant(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      this.currentAssignment.set(await this.assignmentsService.arrivedAtRestaurant(assignment.id));
    } finally {
      this.processingAction.set(null);
    }
  }

  async pickedUp(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      this.currentAssignment.set(await this.assignmentsService.pickedUp(assignment.id));
    } finally {
      this.processingAction.set(null);
    }
  }

  async arrivedAtCustomer(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      this.currentAssignment.set(await this.assignmentsService.arrivedAtCustomer(assignment.id));
    } finally {
      this.processingAction.set(null);
    }
  }

  async verifyOtp(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction() || !this.otpCode()) return;
    this.actionError.set(null);
    this.processingAction.set(assignment.id);
    try {
      this.currentAssignment.set(await this.assignmentsService.verifyOtp(assignment.id, this.otpCode()));
    } catch {
      this.actionError.set('Invalid OTP code. Please ask the customer again.');
    } finally {
      this.processingAction.set(null);
    }
  }

  async markDelivered(assignment: DeliveryAssignment): Promise<void> {
    if (this.processingAction()) return;
    this.processingAction.set(assignment.id);
    try {
      await this.assignmentsService.markDelivered(assignment.id);
      this.otpCode.set('');
      await this.refresh();
    } finally {
      this.processingAction.set(null);
    }
  }
}

