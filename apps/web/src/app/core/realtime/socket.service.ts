import { Injectable, OnDestroy, inject } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { APP_CONFIG } from '../config/app-config.token';
import { TokenStorageService } from '../auth/token-storage.service';

// Thin wrapper around socket.io-client — one authenticated connection per namespace (`/orders`,
// `/tracking`), reused across components instead of each feature reconnecting independently.
// Mirrors the server's JWT-in-handshake-auth contract (apps/api/src/sockets/index.ts).
@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly config = inject(APP_CONFIG);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly sockets = new Map<string, Socket>();

  // Namespace-scoped connection (e.g. '/orders', '/tracking') — reconnects automatically
  // (socket.io-client default) and re-sends the current access token on every (re)connect attempt,
  // since `auth` accepts a function re-evaluated per attempt.
  connectNamespace(namespace: string): Socket {
    let socket = this.sockets.get(namespace);
    if (!socket) {
      socket = io(`${this.config.socketUrl}${namespace}`, {
        autoConnect: false,
        auth: (cb) => cb({ token: this.tokenStorage.getAccessToken() }),
      });
      this.sockets.set(namespace, socket);
    }
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  disconnectNamespace(namespace: string): void {
    this.sockets.get(namespace)?.disconnect();
    this.sockets.delete(namespace);
  }

  disconnectAll(): void {
    for (const socket of this.sockets.values()) {
      socket.disconnect();
    }
    this.sockets.clear();
  }

  ngOnDestroy(): void {
    this.disconnectAll();
  }
}
