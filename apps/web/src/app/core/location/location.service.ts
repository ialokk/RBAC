import { Injectable } from '@angular/core';

export interface GeoPosition {
  lat: number;
  lng: number;
}

export type LocationWatchId = number;

// Browser Geolocation abstraction for Version 1. The interface is intentionally provider-agnostic
// so a future Capacitor/native Android implementation can replace the browser API without any
// caller (home/location picker, delivery tracking in Phase 5/8) needing to change.
// See docs/ARCHITECTURE.md — LocationService abstraction.
@Injectable({ providedIn: 'root' })
export class LocationService {
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  getCurrentPosition(): Promise<GeoPosition> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('Geolocation is not supported on this device'));
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  // Continuous tracking — used only while appropriate (e.g. an active delivery assignment),
  // never left running in the background otherwise. Caller must clearWatch() when done.
  watchPosition(onUpdate: (position: GeoPosition) => void, onError?: (error: GeolocationPositionError) => void): LocationWatchId {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported on this device');
    }
    return navigator.geolocation.watchPosition(
      (position) => onUpdate({ lat: position.coords.latitude, lng: position.coords.longitude }),
      onError,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
  }

  clearWatch(watchId: LocationWatchId): void {
    navigator.geolocation.clearWatch(watchId);
  }
}

