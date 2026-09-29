import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryApplicationService } from '../data/delivery-application.service';
import { DeliveryAssignmentsService } from '../data/delivery-assignments.service';
import { LocationService, type LocationWatchId } from '../../../core/location/location.service';
import { SocketService } from '../../../core/realtime/socket.service';
import type { DeliveryAssignment } from '../data/models';

const ACTIVE_STATUSES: DeliveryAssignment['status'][] = ['ACCEPTED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'];

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly applicationService = inject(DeliveryApplicationService);
  private readonly assignmentsService = inject(DeliveryAssignmentsService);
  private readonly locationService = inject(LocationService);
  private readonly socketService = inject(SocketService);

  private pollHandle?: ReturnType<typeof setInterval>;
  private watchId?: LocationWatchId;

  readonly loading = signal(true);
  readonly availability = signal<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('OFFLINE');
  readonly availableAssignments = signal<DeliveryAssignment[]>([]);
  readonly currentAssignment = signal<DeliveryAssignment | null>(null);
  readonly otpCode = signal('');
  readonly actionError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const application = await this.applicationService.getOwn();
      this.availability.set(application?.availability ?? 'OFFLINE');
      await this.refresh();
    } finally {
      this.loading.set(false);
    }
    // 15s poll stays as the reliability fallback (docs/TASKS.md post-Phase-13 note) — the socket
    // just makes a new offer/cancellation feel instant when the connection is healthy.
    this.pollHandle = setInterval(() => this.refresh(), 15000);

    // DELIVERY_PARTNER sockets auto-join their own partner:<id> room server-side on connect.
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
    const current = await this.assignmentsService.current();
    this.currentAssignment.set(current);
    this.updateLocationTracking(current);

    if (!current && this.availability() === 'AVAILABLE') {
      this.availableAssignments.set((await this.assignmentsService.listAvailable()).items);
    } else {
      this.availableAssignments.set([]);
    }
  }

  async changeAvailability(value: 'AVAILABLE' | 'BUSY' | 'OFFLINE'): Promise<void> {
    await this.assignmentsService.setAvailability(value);
    this.availability.set(value);
    await this.refresh();
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
    await this.assignmentsService.accept(assignment.id);
    await this.refresh();
  }

  async decline(assignment: DeliveryAssignment): Promise<void> {
    await this.assignmentsService.decline(assignment.id);
    await this.refresh();
  }

  async arrivedAtRestaurant(assignment: DeliveryAssignment): Promise<void> {
    this.currentAssignment.set(await this.assignmentsService.arrivedAtRestaurant(assignment.id));
  }

  async pickedUp(assignment: DeliveryAssignment): Promise<void> {
    this.currentAssignment.set(await this.assignmentsService.pickedUp(assignment.id));
  }

  async arrivedAtCustomer(assignment: DeliveryAssignment): Promise<void> {
    this.currentAssignment.set(await this.assignmentsService.arrivedAtCustomer(assignment.id));
  }

  async verifyOtp(assignment: DeliveryAssignment): Promise<void> {
    this.actionError.set(null);
    try {
      this.currentAssignment.set(await this.assignmentsService.verifyOtp(assignment.id, this.otpCode()));
    } catch {
      this.actionError.set('Invalid OTP code — ask the customer to confirm it.');
    }
  }

  async markDelivered(assignment: DeliveryAssignment): Promise<void> {
    await this.assignmentsService.markDelivered(assignment.id);
    this.otpCode.set('');
    await this.refresh();
  }
}
