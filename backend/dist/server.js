"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const socketServer_1 = __importDefault(require("./realtime/socketServer"));
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 8083;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/forge-connect';
async function startServer() {
    try {
        // Attempt MongoDB Connection with optimized pooling and fast timeout failover
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true
        });
        console.log('Successfully connected to MongoDB.');
    }
    catch (error) {
        console.error('Warning: Failed to connect to MongoDB. Starting server without DB:', error);
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