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
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const mongoose_1 = __importDefault(require("mongoose"));
const socketServer_1 = __importDefault(require("./realtime/socketServer"));
const PORT = process.env.PORT || 8083;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
async function startServer() {
    try {
        // Attempt MongoDB Connection with optimized pooling and fast timeout failover
        console.log('Connecting to MongoDB...');
        if (!MONGODB_URI) {
            console.error('FATAL: MONGODB_URI environment variable is not configured. Please define MONGODB_URI in your .env file.');
            process.exit(1);
        }
        await mongoose_1.default.connect(MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            retryWrites: true
        });
        console.log('Successfully connected to MongoDB.');
        // Pre-warm territory hierarchy cache in background so users experience instant <1ms responses
        const { warmupTerritoryCache } = await Promise.resolve().then(() => __importStar(require('./controllers/territory.controller')));
        warmupTerritoryCache().catch(() => { });
    }
    catch (error) {
        console.error('FATAL: Failed to connect to MongoDB Atlas. Cannot start server in uninitialized state:', error.message || error);
        process.exit(1);
    }
    // Create HTTP server wrapping Express
    const server = http_1.default.createServer(app_1.default);
    // Initialize Centralized WebSocket Server
    socketServer_1.default.init(server);
    // Start HTTP + WebSocket Server
    server.listen(PORT, () => {
        console.log(`Server and Realtime WebSocket is running at http://localhost:${PORT}`);
    });
}
startServer();
//# sourceMappingURL=server.js.map