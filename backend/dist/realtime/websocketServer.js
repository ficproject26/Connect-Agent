"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeWebSocketServer = void 0;
const ws_1 = require("ws");
const url = __importStar(require("url"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redisClient_1 = require("./redisClient");
const eventPublisher_1 = require("./eventPublisher");
const JWT_SECRET = process.env.JWT_SECRET || 'forge_connect_jwt_secret_key_2026';
class RealtimeWebSocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.metrics = {
            totalConnected: 0,
            currentConnected: 0,
            totalDelivered: 0,
            totalBroadcasts: 0,
            averageLatencyMs: 0
        };
        this.pingInterval = null;
    }
    attach(httpServer) {
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        httpServer.on('upgrade', (request, socket, head) => {
            const pathname = url.parse(request.url || '').pathname;
            if (pathname === '/ws' || pathname === '/realtime' || pathname === '/api/ws') {
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            }
        });
        this.wss.on('connection', (ws, req) => {
            const client = ws;
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
        if (this.pingInterval.unref)
            this.pingInterval.unref();
        redisClient_1.redisBroker.subscribe(eventPublisher_1.GLOBAL_CHANNEL, (event) => {
            this.broadcastEvent(event);
        });
        console.log('⚡ [Agent Realtime WebSocket] Attached to HTTP server on /ws and /realtime');
    }
    handleConnection(client, req) {
        client.isAlive = true;
        client.isAuthenticated = false;
        client.on('pong', () => {
            client.isAlive = true;
        });
        try {
            const parsedUrl = url.parse(req.url || '', true);
            const token = parsedUrl.query.token;
            if (token) {
                this.authenticateClient(client, token);
            }
        }
        catch { }
        client.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'AUTH' && msg.token) {
                    this.authenticateClient(client, msg.token);
                }
                else if (msg.type === 'PING') {
                    client.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
            }
            catch { }
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
    authenticateClient(client, token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
        }
        catch {
            client.send(JSON.stringify({
                type: 'AUTH_FAILED',
                message: 'Invalid or expired token'
            }));
        }
    }
    isAuthorizedForClient(event, client) {
        if (!client.isAuthenticated || !client.agent)
            return false;
        const agent = client.agent;
        const scope = event.scope || {};
        if (scope.targetUserId) {
            const target = String(scope.targetUserId).toLowerCase();
            if (target !== String(agent.id).toLowerCase() && target !== String(agent.agentId).toLowerCase() && target !== String(agent.email).toLowerCase()) {
                return false;
            }
        }
        const norm = (s) => (s || '').toString().trim().toLowerCase();
        if (scope.pincodeId || scope.pincode) {
            const agtPin = norm(agent.pincode);
            const evPin = norm(scope.pincodeId || scope.pincode);
            if (agtPin && evPin && agtPin !== evPin)
                return false;
        }
        if (scope.stateId || scope.state) {
            const agtState = norm(agent.state);
            const evState = norm(scope.stateId || scope.state);
            if (agtState && evState && agtState !== evState)
                return false;
        }
        return true;
    }
    broadcastEvent(event) {
        if (!this.wss || this.clients.size === 0)
            return;
        this.metrics.totalBroadcasts++;
        const now = Date.now();
        const emittedAt = event.meta?.emittedAt || now;
        const latency = Math.max(0, now - emittedAt);
        this.metrics.averageLatencyMs = Math.round((this.metrics.averageLatencyMs * 0.8) + (latency * 0.2));
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
            if (client.readyState === ws_1.WebSocket.OPEN && this.isAuthorizedForClient(event, client)) {
                client.send(messagePayload);
                deliveredCount++;
            }
        }
        this.metrics.totalDelivered += deliveredCount;
        if (deliveredCount > 0) {
            console.log(`⚡ [Agent Realtime WebSocket] Delivered ${event.event} to ${deliveredCount} agent(s) (latency: ${latency}ms)`);
        }
    }
    getHealth() {
        return {
            status: 'healthy',
            connectedClients: this.clients.size,
            authenticatedClients: Array.from(this.clients).filter(c => c.isAuthenticated).length,
            metrics: this.metrics,
            broker: redisClient_1.redisBroker.getStatus()
        };
    }
}
exports.realtimeWebSocketServer = new RealtimeWebSocketServer();
exports.default = exports.realtimeWebSocketServer;
//# sourceMappingURL=websocketServer.js.map