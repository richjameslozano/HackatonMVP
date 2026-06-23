// ─── WebSocket Service ───────────────────────────────────────────────────────

import type { EventMessage, ConnectionState } from '../types/realtime';
import { validateEventMessage } from './message-validator';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WebSocketServiceOptions {
  url: string;
  heartbeatIntervalMs?: number;      // default: 30_000
  heartbeatTimeoutMs?: number;       // default: 5_000
  maxReconnectAttempts?: number;     // default: 10
  initialReconnectDelayMs?: number;  // default: 1_000
  maxReconnectDelayMs?: number;      // default: 30_000
}

export type MessageHandler = (message: EventMessage) => void;
export type StateChangeHandler = (state: ConnectionState) => void;

// ─── WebSocket Service Class ────────────────────────────────────────────────

class WebSocketService {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();
  private options: WebSocketServiceOptions | null = null;
  private manualDisconnect = false;

  /**
   * Returns the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Establishes a WebSocket connection with the given options.
   * Uses VITE_WS_URL as default URL if none provided.
   */
  connect(options?: Partial<WebSocketServiceOptions>): void {
    const url = options?.url ?? import.meta.env.VITE_WS_URL;

    if (!url) {
      console.error('[WebSocket] No URL provided and VITE_WS_URL is not set');
      return;
    }

    this.options = {
      url,
      heartbeatIntervalMs: options?.heartbeatIntervalMs ?? 30_000,
      heartbeatTimeoutMs: options?.heartbeatTimeoutMs ?? 5_000,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 10,
      initialReconnectDelayMs: options?.initialReconnectDelayMs ?? 1_000,
      maxReconnectDelayMs: options?.maxReconnectDelayMs ?? 30_000,
    };

    this.manualDisconnect = false;
    this.establishConnection();
  }

  /**
   * Gracefully closes the WebSocket connection with code 1000.
   * Stops heartbeat and clears all reconnection timers.
   */
  disconnect(): void {
    this.manualDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  /**
   * Subscribes to incoming validated messages.
   * Returns an unsubscribe function.
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Subscribes to connection state changes.
   * Returns an unsubscribe function.
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  private establishConnection(): void {
    if (!this.options) return;

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.options.url);
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket instance:', error);
      this.handleConnectionFailure();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      // Treat any incoming message as a pong (resets pong timeout)
      this.resetPongTimer();

      try {
        const raw = JSON.parse(event.data as string);
        const message = validateEventMessage(raw);

        if (message) {
          this.notifyMessageHandlers(message);
        }
      } catch (error) {
        console.warn('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;

      if (!this.manualDisconnect) {
        this.handleConnectionFailure();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      // onclose will fire after onerror, so let onclose handle reconnection
    };
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(newState);
      } catch (error) {
        console.error('[WebSocket] State change handler error:', error);
      }
    });
  }

  private notifyMessageHandlers(message: EventMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WebSocket] Message handler error:', error);
      }
    });
  }

  private startHeartbeat(): void {
    if (!this.options) return;

    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send a ping frame as a JSON message
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.startPongTimer();
      }
    }, this.options.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimer();
  }

  private startPongTimer(): void {
    if (!this.options) return;

    this.clearPongTimer();

    this.pongTimer = setTimeout(() => {
      this.handlePongTimeout();
    }, this.options.heartbeatTimeoutMs);
  }

  private clearPongTimer(): void {
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private resetPongTimer(): void {
    // Any incoming message counts as proof the connection is alive
    this.clearPongTimer();
  }

  private handlePongTimeout(): void {
    console.warn('[WebSocket] Pong timeout — treating connection as dropped');
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(4000, 'Pong timeout');
      this.ws = null;
    }

    this.handleConnectionFailure();
  }

  private handleConnectionFailure(): void {
    if (!this.options) return;

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      this.setState('failed');
      return;
    }

    this.setState('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.options) return;

    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Computes the exponential backoff delay:
   * delay = min(initialDelay * 2^attempt, maxDelay)
   */
  getReconnectDelay(attempt?: number): number {
    if (!this.options) return 1_000;

    const n = attempt ?? this.reconnectAttempts;
    const { initialReconnectDelayMs, maxReconnectDelayMs } = this.options;

    return Math.min(
      initialReconnectDelayMs! * Math.pow(2, n),
      maxReconnectDelayMs!
    );
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const websocketService = new WebSocketService();
