import { Server as HttpServer } from 'http';
import { RealtimeEvent } from './eventTypes';
declare class CentralizedSocketServer {
    private wss;
    private clients;
    private agentSocketMap;
    private heartbeatInterval;
    private metrics;
    /**
     * Initializes the WebSocket server attached to the Node HTTP server.
     */
    init(httpServer: HttpServer): void;
    /**
     * Handle incoming WebSocket connection and perform JWT authentication.
     */
    private handleConnection;
    /**
     * Handle socket disconnection and cleanup tracking maps.
     */
    private handleDisconnect;
    /**
     * Heartbeat to detect dead TCP connections and purge orphaned sockets.
     */
    private startHeartbeat;
    /**
     * Evaluates if a given client is authorized to receive the event based on scope.
     */
    private isClientAuthorized;
    /**
     * Broadcast an event to all authorized connected WebSocket clients.
     */
    broadcastEvent(event: RealtimeEvent): void;
    /**
     * Observability & Status reporting
     */
    getStatus(): {
        status: string;
        currentConnectedSockets: number;
        uniqueConnectedAgents: number;
        metrics: {
            totalConnectionsEver: number;
            currentConnectedSockets: number;
            uniqueConnectedAgents: number;
            eventsDelivered: number;
            startTime: string;
        };
        redisPubSub: {
            status: string;
            isRedisConnected: boolean;
            channel: string;
            metrics: {
                eventsPublished: number;
                eventsReceived: number;
                duplicatesDropped: number;
                lastEventTime: string | null;
                startedAt: string;
            };
            trackedEventsInWindow: number;
        };
    };
}
export declare const socketServer: CentralizedSocketServer;
export default socketServer;
//# sourceMappingURL=socketServer.d.ts.map