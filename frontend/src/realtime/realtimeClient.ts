/**
 * Centralized Real-time WebSocket Client
 * Generic, high-performance, fault-tolerant WebSocket communication layer
 * connecting frontend applications to the backend event-driven ecosystem.
 */

export interface RealtimeEvent<T = any> {
  eventId: string;
  event: string;
  entity: string;
  entityId: string;
  action: string;
  timestamp: string;
  version: number;
  scope?: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
    roles?: string[];
    targetAgentId?: string;
    isPublic?: boolean;
  };
  data?: T;
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

type EventHandler<T = any> = (event: RealtimeEvent<T>) => void;
type StatusHandler = (status: ConnectionStatus) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isIntentionallyClosed = false;

  // Deduplication & versioning tracking
  private seenEvents: Set<string> = new Set();
  private entityVersions: Map<string, number> = new Map(); // entityId -> highest version/timestamp

  // Listener registries
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();

  constructor() {
    // Listen for tab focus/online events to proactively restore connection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.token && this.status !== 'CONNECTED') {
          console.log('[RealtimeClient] Network online detected. Reconnecting...');
          this.reconnect();
        }
      });
    }
  }

  /**
   * Derive the WebSocket server URL from the configured API endpoint or window location.
   */
  public getWebSocketUrl(token?: string): string {
    const rawApiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
    let baseWsUrl = '';

    if (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) {
      baseWsUrl = rawApiUrl
        .replace(/^http:\/\//, 'ws://')
        .replace(/^https:\/\//, 'wss://')
        .replace(/\/api\/?$/, '');
    } else {
      // Relative URL — derive from window.location
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8083';
      baseWsUrl = `${protocol}//${host}`;
    }

    // Ensure port 8083 if localhost
    if (baseWsUrl.includes('localhost') && !baseWsUrl.includes(':8083')) {
      baseWsUrl = baseWsUrl.replace(/localhost(:\d+)?/, 'localhost:8083');
    }

    const wsUrl = `${baseWsUrl}/ws`;
    return token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const handler of this.statusHandlers) {
        try {
          handler(newStatus);
        } catch (e) {
          console.error('[RealtimeClient] Status handler error:', e);
        }
      }
    }
  }

  /**
   * Connect to the centralized real-time WebSocket server with the user JWT.
   */
  public connect(token: string) {
    if (!token) return;

    // If already connected with the same token, do nothing
    if (this.socket && this.status === 'CONNECTED' && this.token === token) {
      return;
    }

    this.token = token;
    this.isIntentionallyClosed = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);

    try {
      const url = this.getWebSocketUrl(token);
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        console.log('[RealtimeClient] Connected to centralized real-time server.');

        // Dispatch a reconnect state-sync event so components can reconcile if offline
        this.dispatchLocalSync();

        // Start ping heartbeat
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = (event) => {
        clearInterval(this.pingInterval);
        this.setStatus('DISCONNECTED');

        if (!this.isIntentionallyClosed && this.token) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[RealtimeClient] WebSocket error encountered.');
      };
    } catch (err: any) {
      console.warn('[RealtimeClient] Failed to establish WebSocket connection:', err.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule automatic reconnect with exponential backoff and jitter.
   */
  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);

    if (this.isIntentionallyClosed || !this.token) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[RealtimeClient] Max reconnection attempts reached. Pausing until user activity.');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s (max 10s) + jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;

    this.reconnectAttempts++;
    this.setStatus('RECONNECTING');

    this.reconnectTimeout = setTimeout(() => {
      if (this.token && !this.isIntentionallyClosed) {
        this.connect(this.token);
      }
    }, delay);
  }

  public reconnect() {
    this.reconnectAttempts = 0;
    if (this.token) {
      this.connect(this.token);
    }
  }

  /**
   * Process raw message from server.
   */
  private handleMessage(rawData: string) {
    try {
      const parsed = JSON.parse(rawData);

      if (parsed.type === 'PONG') {
        return;
      }

      if (parsed.type === 'CONNECTED') {
        console.log('[RealtimeClient] Handshake confirmed by server:', parsed.socketId);
        return;
      }

      if (parsed.type === 'EVENT' && parsed.payload) {
        const event: RealtimeEvent = parsed.payload;

        // 1. Deduplication check
        if (this.seenEvents.has(event.eventId)) {
          return;
        }

        // Keep seen event IDs under bounded size
        if (this.seenEvents.size > 1000) {
          const firstKey = this.seenEvents.values().next().value;
          if (firstKey) this.seenEvents.delete(firstKey);
        }
        this.seenEvents.add(event.eventId);

        // 2. Event Versioning / Out-of-order check
        const eventVer = event.version || new Date(event.timestamp).getTime();
        const prevVer = this.entityVersions.get(event.entityId);
        if (prevVer && eventVer < prevVer) {
          console.warn(`[RealtimeClient] Dropped older out-of-order event for ${event.entityId} (v${eventVer} < v${prevVer})`);
          return;
        }
        this.entityVersions.set(event.entityId, eventVer);

        // 3. Dispatch to listeners
        this.dispatch(event);
      }
    } catch (err) {
      console.error('[RealtimeClient] Error handling message:', err);
    }
  }

  /**
   * Dispatch parsed real-time event to registered listeners and window CustomEvent.
   */
  private dispatch(event: RealtimeEvent) {
    // Latency measurement
    const sendTime = new Date(event.timestamp).getTime();
    if (!isNaN(sendTime)) {
      const propagationLatency = Date.now() - sendTime;
      console.log(
        `[Realtime] Received ${event.event} (${event.entity}:${event.entityId}) action=${event.action} in ${propagationLatency}ms`
      );
    }

    // 1. Handlers subscribed to this specific entity or event name
    const entityHandlers = this.eventHandlers.get(event.entity);
    if (entityHandlers) {
      for (const handler of entityHandlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('[RealtimeClient] Handler error:', e);
        }
      }
    }

    const eventNameHandlers = this.eventHandlers.get(event.event);
    if (eventNameHandlers) {
      for (const handler of eventNameHandlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('[RealtimeClient] Handler error:', e);
        }
      }
    }

    // 2. Global wildcard handlers
    for (const handler of this.globalHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('[RealtimeClient] Global handler error:', e);
      }
    }

    // 3. Dispatch native DOM CustomEvent for decoupled application listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('connect:realtime', {
          detail: event
        })
      );
    }
  }

  private dispatchLocalSync() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connect:realtime:sync'));
    }
  }

  /**
   * Subscribe to events for a specific entity (e.g. 'vendor', 'agent', 'wallet') or event name.
   */
  public on<T = any>(entityOrEvent: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(entityOrEvent)) {
      this.eventHandlers.set(entityOrEvent, new Set());
    }
    this.eventHandlers.get(entityOrEvent)!.add(handler as EventHandler);

    return () => {
      const set = this.eventHandlers.get(entityOrEvent);
      if (set) {
        set.delete(handler as EventHandler);
        if (set.size === 0) this.eventHandlers.delete(entityOrEvent);
      }
    };
  }

  /**
   * Subscribe to all real-time events.
   */
  public onAny(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection status changes.
   */
  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Disconnect the client explicitly (e.g. on logout).
   */
  public disconnect() {
    this.isIntentionallyClosed = true;
    this.token = null;
    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    this.setStatus('DISCONNECTED');
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }
}

export const realtimeClient = new RealtimeClient();
export default realtimeClient;
