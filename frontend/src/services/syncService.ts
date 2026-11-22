import { RescueStreamEvent } from '../types';

type SyncCallback = (event: RescueStreamEvent) => void;

class SyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncCallback> = new Set();
  private storageKey = 'surpluslink_sync_event';

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('surpluslink_ai_sync');
        this.channel.onmessage = (e) => {
          if (e.data) {
            this.notifyListeners(e.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && e.newValue) {
          try {
            const event = JSON.parse(e.newValue);
            this.notifyListeners(event);
          } catch (err) {
            // Ignore corrupted payload
          }
        }
      });
    }
  }

  public broadcast(event: RescueStreamEvent): void {
    // 1. Post to BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn('Failed to broadcast via channel:', err);
      }
    }

    // 2. Storage fallback for multi-window sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ ...event, _t: Date.now() }));
      } catch (err) {
        // Storage might be full or private
      }
    }

    // Also notify local listeners in current window
    this.notifyListeners(event);
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(event: RescueStreamEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }
}

export const syncManager = new SyncManager();
