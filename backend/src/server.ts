import 'dotenv/config';
import http from 'http';
import app from './app';
import mongoose from 'mongoose';
import socketServer from './realtime/socketServer';

const PORT = process.env.PORT || 8083;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Connect-App:Dhanush123@cluster0.riukwbj.mongodb.net/connect_db?retryWrites=true&w=majority';

async function startServer() {
  try {
    // Attempt MongoDB Connection with optimized pooling and fast timeout failover
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true
    });
    console.log('Successfully connected to MongoDB.');
    // Pre-warm territory hierarchy cache in background so users experience instant <1ms responses
    const { warmupTerritoryCache } = await import('./controllers/territory.controller');
    warmupTerritoryCache().catch(() => {});
  } catch (error: any) {
    console.error('FATAL: Failed to connect to MongoDB Atlas. Cannot start server in uninitialized state:', error.message || error);
    process.exit(1);
  }

  // Create HTTP server wrapping Express
  const server = http.createServer(app);

  // Initialize Centralized WebSocket Server
  socketServer.init(server);

  // Start HTTP + WebSocket Server
  server.listen(PORT, () => {
    console.log(`Server and Realtime WebSocket is running at http://localhost:${PORT}`);
  });
}

startServer();

