import * as http from 'http';
declare class RealtimeWebSocketServer {
    private wss;
    private clients;
    private metrics;
    private pingInterval;
    attach(httpServer: http.Server): void;
    private handleConnection;
    private authenticateClient;
    private isAuthorizedForClient;
    broadcastEvent(event: any): void;
    getHealth(): {
        status: string;
        connectedClients: number;
        authenticatedClients: number;
        metrics: {
            totalConnected: number;
            currentConnected: number;
            totalDelivered: number;
            totalBroadcasts: number;
            averageLatencyMs: number;
        };
        broker: {
            broker: string;
            isRedisConnected: boolean;
            activeChannels: string[];
            subscriberCount: number;
        };
    };
}
export declare const realtimeWebSocketServer: RealtimeWebSocketServer;
export default realtimeWebSocketServer;
//# sourceMappingURL=websocketServer.d.ts.map