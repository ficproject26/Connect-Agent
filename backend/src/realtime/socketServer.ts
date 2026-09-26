import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { RealtimeEvent, ClientConnectionInfo } from './eventTypes';
import redisPubSub from './redisPubSub';
import Agent from '../models/Agent';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  clientInfo?: ClientConnectionInfo;
  id: string;
}

class CentralizedSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, AuthenticatedWebSocket> = new Map(); // socketId -> socket
  private agentSocketMap: Map<string, Set<string>> = new Map(); // agentId -> Set<socketId>
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Observability metrics
  private metrics = {
    totalConnectionsEver: 0,
    currentConnectedSockets: 0,
    uniqueConnectedAgents: 0,
    eventsDelivered: 0,
    startTime: new Date().toISOString()
  };

  /**
   * Initializes the WebSocket server attached to the Node HTTP server.
   */
  public init(httpServer: HttpServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      clientTracking: false // We maintain our own rich client map
    });

    console.log('[SocketServer] Centralized WebSocket server initialized on path /ws');

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws as AuthenticatedWebSocket, req);
    });

    this.startHeartbeat();

    // Subscribe to Redis Pub/Sub events to distribute across all local sockets
    redisPubSub.onEvent((event: RealtimeEvent) => {
      this.broadcastEvent(event);
    });
  }

  /**
   * Handle incoming WebSocket connection and perform JWT authentication.
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: any) {
    const socketId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    ws.id = socketId;
    ws.isAlive = true;

    // Parse token from query string or header
    let token: string | null = null;
    try {
      const parsedUrl = url.parse(req.url || '', true);
      if (parsedUrl.query && parsedUrl.query.token) {
        token = Array.isArray(parsedUrl.query.token) ? parsedUrl.query.token[0] : parsedUrl.query.token;
      }
    } catch (e) {}

    if (!token && req.headers['sec-websocket-protocol']) {
      token = req.headers['sec-websocket-protocol'].split(',')[0].trim();
    }

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    let payload: TokenPayload | null = null;
    if (token) {
      try {
        payload = verifyToken(token);
      } catch (err: any) {
        console.warn(`[SocketServer] Rejecting connection ${socketId}: Invalid or expired JWT (${err.message})`);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized: Invalid token' }));
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    // Set up ping-pong heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Populate client metadata
    const agentId = payload?.agentId || 'anonymous';
    const role = payload?.role || 'guest';
    const email = payload?.email || '';

    // Load agent territory for scoped event filtering
    let territory: any = undefined;
    if (payload?.agentId && payload.agentId !== 'admin') {
      try {
        const agentDoc = await Agent.findById(payload.agentId).select('territory role').lean();
        if (agentDoc && agentDoc.territory) {
          territory = agentDoc.territory;
        }
      } catch (e) {}
    }

    const clientInfo: ClientConnectionInfo = {
      agentId,
      role,
      email,
      territory,
      connectedAt: new Date()
    };

    ws.clientInfo = clientInfo;

    // Register socket
    this.clients.set(socketId, ws);
    if (!this.agentSocketMap.has(agentId)) {
      this.agentSocketMap.set(agentId, new Set());
    }
    this.agentSocketMap.get(agentId)!.add(socketId);

    // Update metrics
    this.metrics.totalConnectionsEver++;
    this.metrics.currentConnectedSockets = this.clients.size;
    this.metrics.uniqueConnectedAgents = this.agentSocketMap.size;

    console.log(
      `[SocketServer] Client connected: socketId=${socketId}, agentId=${agentId}, role=${role} (Total: ${this.clients.size})`
    );

    // Send connection acknowledgement and initial sync metadata
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        socketId,
        serverTime: new Date().toISOString(),
        agentId,
        role
      })
    );

    // Handle incoming client messages (e.g., ping, subscription filter updates)
    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {}
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
      this.handleDisconnect(socketId, agentId, code, reason?.toString());
    });

    ws.on('error', (err) => {
      console.warn(`[SocketServer] Socket error on ${socketId}:`, err.message);
    });
  }

  /**
   * Handle socket disconnection and cleanup tracking maps.
   */
  private handleDisconnect(socketId: string, agentId: string, code: number, reason?: string) {
    this.clients.delete(socketId);

    const agentSockets = this.agentSocketMap.get(agentId);
    if (agentSockets) {
      agentSockets.delete(socketId);
      if (agentSockets.size === 0) {
        this.agentSocketMap.delete(agentId);
      }
    }

    this.metrics.currentConnectedSockets = this.clients.size;
    this.metrics.uniqueConnectedAgents = this.agentSocketMap.size;

    console.log(`[SocketServer] Client disconnected: socketId=${socketId}, agentId=${agentId} (Remaining: ${this.clients.size})`);
  }

  /**
   * Heartbeat to detect dead TCP connections and purge orphaned sockets.
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const [socketId, ws] of this.clients.entries()) {
        if (!ws.isAlive) {
          console.log(`[SocketServer] Terminating unresponsive socket: ${socketId}`);
          ws.terminate();
          this.clients.delete(socketId);
          continue;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (e) {
          ws.terminate();
          this.clients.delete(socketId);
        }
      }
      this.metrics.currentConnectedSockets = this.clients.size;
      this.metrics.uniqueConnectedAgents = this.agentSocketMap.size;
    }, 30000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Evaluates if a given client is authorized to receive the event based on scope.
   */
  private isClientAuthorized(client: ClientConnectionInfo, scope?: RealtimeEvent['scope']): boolean {
    if (!scope || scope.isPublic) {
      return true;
    }

    // Direct recipient check
    if (scope.targetAgentId && scope.targetAgentId !== client.agentId) {
      return false;
    }

    // Exclude sender
    if (scope.excludeAgentId && scope.excludeAgentId === client.agentId) {
      return false;
    }

    // Role-based filtering
    if (scope.roles && scope.roles.length > 0 && !scope.roles.includes(client.role)) {
      return false;
    }

    // Territory-based scoping
    // Admins and state agents can view wider scope
    if (client.role === 'state' || client.role === 'admin' || client.role === 'superadmin') {
      return true;
    }

    const territory = client.territory;
    if (!territory) return true; // Default allow if territory is undefined

    if (scope.pincode && territory.pincode && scope.pincode !== territory.pincode) {
      return false;
    }

    if (scope.district && territory.district && scope.district.toLowerCase() !== territory.district.toLowerCase()) {
      return false;
    }

    if (scope.division && territory.division && scope.division.toLowerCase() !== territory.division.toLowerCase()) {
      return false;
    }

    return true;
  }

  /**
   * Broadcast an event to all authorized connected WebSocket clients.
   */
  public broadcastEvent(event: RealtimeEvent) {
    const rawPayload = JSON.stringify({
      type: 'EVENT',
      payload: event
    });

    let deliveredCount = 0;

    for (const [, ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && ws.clientInfo) {
        if (this.isClientAuthorized(ws.clientInfo, event.scope)) {
          try {
            ws.send(rawPayload);
            deliveredCount++;
          } catch (err: any) {
            console.warn(`[SocketServer] Error sending to socket ${ws.id}:`, err.message);
          }
        }
      }
    }

    this.metrics.eventsDelivered += deliveredCount;
  }

  /**
   * Observability & Status reporting
   */
  public getStatus() {
    return {
      status: 'active',
      currentConnectedSockets: this.clients.size,
      uniqueConnectedAgents: this.agentSocketMap.size,
      metrics: { ...this.metrics },
      redisPubSub: redisPubSub.getStatus()
    };
  }
}

export const socketServer = new CentralizedSocketServer();
export default socketServer;
