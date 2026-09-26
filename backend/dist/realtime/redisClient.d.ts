declare class RedisBroker {
    private pubClient;
    private subClient;
    private memoryBus;
    isRedisConnected: boolean;
    private subscribers;
    constructor();
    private init;
    publish(channel: string, data: any): Promise<boolean>;
    subscribe(channel: string, callback: (data: any) => void): () => void;
    getStatus(): {
        broker: string;
        isRedisConnected: boolean;
        activeChannels: string[];
        subscriberCount: number;
    };
}
export declare const redisBroker: RedisBroker;
export default redisBroker;
//# sourceMappingURL=redisClient.d.ts.map