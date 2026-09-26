"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketServer = void 0;
const ws_1 = require("ws");
const url_1 = __importDefault(require("url"));
const jwt_1 = require("../utils/jwt");
const redisPubSub_1 = __importDefault(require("./redisPubSub"));
const Agent_1 = __importDefault(require("../models/Agent"));
class CentralizedSocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // socketId -> socket
        this.agentSocketMap = new Map(); // agentId -> Set<socketId>
        this.heartbeatInterval = null;
        // Observability metrics
        this.metrics = {
            totalConnectionsEver: 0,
            currentConnectedSockets: 0,
            uniqueConnectedAgents: 0,
            eventsDelivered: 0,
            startTime: new Date().toISOString()
        };
    }
    /**
     * Initializes the WebSocket server attached to the Node HTTP server.
     */
    init(httpServer) {
        this.wss = new ws_1.WebSocketServer({
            server: httpServer,
            path: '/ws',
            clientTracking: false // We maintain our own rich client map
        });
        console.log('[SocketServer] Centralized WebSocket server initialized on path /ws');
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        this.startHeartbeat();
        // Subscribe to Redis Pub/Sub events to distribute across all local sockets
        redisPubSub_1.default.onEvent((event) => {
            this.broadcastEvent(event);
        });
    }
    /**
     * Handle incoming WebSocket connection and perform JWT authentication.
     */
    async handleConnection(ws, req) {
        const socketId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        ws.id = socketId;
        ws.isAlive = true;
        // Parse token from query string or header
        let token = null;
        try {
            const parsedUrl = url_1.default.parse(req.url || '', true);
            if (parsedUrl.query && parsedUrl.query.token) {
                token = Array.isArray(parsedUrl.query.token) ? parsedUrl.query.token[0] : parsedUrl.query.token;
            }
        }
        catch (e) { }
        if (!token && req.headers['sec-websocket-protocol']) {
            token = req.headers['sec-websocket-protocol'].split(',')[0].trim();
        }
        if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }
        let payload = null;
        if (token) {
            try {
                payload = (0, jwt_1.verifyToken)(token);
            }
            catch (err) {
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
        let territory = undefined;
        if (payload?.agentId && payload.agentId !== 'admin') {
            try {
                const agentDoc = await Agent_1.default.findById(payload.agentId).select('territory role').lean();
                if (agentDoc && agentDoc.territory) {
                    territory = agentDoc.territory;
                }
            }
            catch (e) { }
        }
        const clientInfo = {
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
        this.agentSocketMap.get(agentId).add(socketId);
        // Update metrics
        this.metrics.totalConnectionsEver++;
        this.metrics.currentConnectedSockets = this.clients.size;
        this.metrics.uniqueConnectedAgents = this.agentSocketMap.size;
        console.log(`[SocketServer] Client connected: socketId=${socketId}, agentId=${agentId}, role=${role} (Total: ${this.clients.size})`);
        // Send connection acknowledgement and initial sync metadata
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            socketId,
            serverTime: new Date().toISOString(),
            agentId,
            role
        }));
        // Handle incoming client messages (e.g., ping, subscription filter updates)
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
            }
            catch (e) { }
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
    handleDisconnect(socketId, agentId, code, reason) {
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
    startHeartbeat() {
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
                }
                catch (e) {
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
    isClientAuthorized(client, scope) {
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
        if (!territory)
            return true; // Default allow if territory is undefined
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
    broadcastEvent(event) {
        const rawPayload = JSON.stringify({
            type: 'EVENT',
            payload: event
        });
        let deliveredCount = 0;
        for (const [, ws] of this.clients.entries()) {
            if (ws.readyState === ws_1.WebSocket.OPEN && ws.clientInfo) {
                if (this.isClientAuthorized(ws.clientInfo, event.scope)) {
                    try {
                        ws.send(rawPayload);
                        deliveredCount++;
                    }
                    catch (err) {
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
    getStatus() {
        return {
            status: 'active',
            currentConnectedSockets: this.clients.size,
            uniqueConnectedAgents: this.agentSocketMap.size,
            metrics: { ...this.metrics },
            redisPubSub: redisPubSub_1.default.getStatus()
        };
    }
}
exports.socketServer = new CentralizedSocketServer();
exports.default = exports.socketServer;
//# sourceMappingURL=socketServer.js.map