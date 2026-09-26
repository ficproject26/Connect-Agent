import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as url from 'url';
import jwt from 'jsonwebtoken';
import { redisBroker } from './redisClient';
import { GLOBAL_CHANNEL } from './eventPublisher';

const JWT_SECRET = process.env.JWT_SECRET || 'forge_connect_jwt_secret_key_2026';

interface AuthenticatedClient extends WebSocket {
  isAlive: boolean;
  isAuthenticated: boolean;
  agent?: {
    id: string;
    agentId: string;
    email: string;
    role: string;
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
  };
}

class RealtimeWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedClient> = new Set();
  private metrics = {
    totalConnected: 0,
    currentConnected: 0,
    totalDelivered: 0,
    totalBroadcasts: 0,
    averageLatencyMs: 0
  };
  private pingInterval: any = null;

  public attach(httpServer: http.Server) {
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const pathname = url.parse(request.url || '').pathname;
      if (pathname === '/ws' || pathname === '/realtime' || pathname === '/api/ws') {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const client = ws as AuthenticatedClient;
      this.handleConnection(client, req);
    });

    this.pingInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, 30000);
    if (this.pingInterval.unref) this.pingInterval.unref();

    redisBroker.subscribe(GLOBAL_CHANNEL, (event: any) => {
      this.broadcastEvent(event);
    });

    console.log('⚡ [Agent Realtime WebSocket] Attached to HTTP server on /ws and /realtime');
  }

  private handleConnection(client: AuthenticatedClient, req: http.IncomingMessage) {
    client.isAlive = true;
    client.isAuthenticated = false;

    client.on('pong', () => {
      client.isAlive = true;
    });

    try {
      const parsedUrl = url.parse(req.url || '', true);
      const token = parsedUrl.query.token as string;
      if (token) {
        this.authenticateClient(client, token);
      }
    } catch {}

    client.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'AUTH' && msg.token) {
          this.authenticateClient(client, msg.token);
        } else if (msg.type === 'PING') {
          client.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch {}
    });

    client.on('close', () => {
      this.clients.delete(client);
      this.metrics.currentConnected = this.clients.size;
    });

    client.on('error', () => {
      this.clients.delete(client);
      this.metrics.currentConnected = this.clients.size;
    });

    this.clients.add(client);
    this.metrics.totalConnected++;
    this.metrics.currentConnected = this.clients.size;

    client.send(JSON.stringify({
      type: 'CONNECTION_READY',
      serverTime: new Date().toISOString(),
      requiresAuth: !client.isAuthenticated
    }));
  }

  private authenticateClient(client: AuthenticatedClient, token: string) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      client.isAuthenticated = true;
      client.agent = {
        id: decoded.id || decoded.userId || decoded._id,
        agentId: decoded.agentId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'agent',
        state: decoded.state,
        district: decoded.district,
        division: decoded.division,
        pincode: decoded.pincode
      };

      client.send(JSON.stringify({
        type: 'AUTH_SUCCESS',
        agentId: client.agent.agentId,
        role: client.agent.role
      }));
    } catch {
      client.send(JSON.stringify({
        type: 'AUTH_FAILED',
        message: 'Invalid or expired token'
      }));
    }
  }

  private isAuthorizedForClient(event: any, client: AuthenticatedClient): boolean {
    if (!client.isAuthenticated || !client.agent) return false;

    const agent = client.agent;
    const scope = event.scope || {};

    if (scope.targetUserId) {
      const target = String(scope.targetUserId).toLowerCase();
      if (target !== String(agent.id).toLowerCase() && target !== String(agent.agentId).toLowerCase() && target !== String(agent.email).toLowerCase()) {
        return false;
      }
    }

    const norm = (s?: string | null) => (s || '').toString().trim().toLowerCase();

    if (scope.pincodeId || scope.pincode) {
      const agtPin = norm(agent.pincode);
      const evPin = norm(scope.pincodeId || scope.pincode);
      if (agtPin && evPin && agtPin !== evPin) return false;
    }

    if (scope.stateId || scope.state) {
      const agtState = norm(agent.state);
      const evState = norm(scope.stateId || scope.state);
      if (agtState && evState && agtState !== evState) return false;
    }

    return true;
  }

  public broadcastEvent(event: any) {
    if (!this.wss || this.clients.size === 0) return;

    this.metrics.totalBroadcasts++;
    const now = Date.now();
    const emittedAt = event.meta?.emittedAt || now;
    const latency = Math.max(0, now - emittedAt);

    this.metrics.averageLatencyMs = Math.round(
      (this.metrics.averageLatencyMs * 0.8) + (latency * 0.2)
    );

    const messagePayload = JSON.stringify({
      ...event,
      meta: {
        ...event.meta,
        deliveredAt: now,
        latencyMs: latency
      }
    });

    let deliveredCount = 0;
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN && this.isAuthorizedForClient(event, client)) {
        client.send(messagePayload);
        deliveredCount++;
      }
    }

    this.metrics.totalDelivered += deliveredCount;
    if (deliveredCount > 0) {
      console.log(`⚡ [Agent Realtime WebSocket] Delivered ${event.event} to ${deliveredCount} agent(s) (latency: ${latency}ms)`);
    }
  }

  public getHealth() {
    return {
      status: 'healthy',
      connectedClients: this.clients.size,
      authenticatedClients: Array.from(this.clients).filter(c => c.isAuthenticated).length,
      metrics: this.metrics,
      broker: redisBroker.getStatus()
    };
  }
}

export const realtimeWebSocketServer = new RealtimeWebSocketServer();
export default realtimeWebSocketServer;
