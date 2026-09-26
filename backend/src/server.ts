import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8083;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/forge-connect';

async function startServer() {
  try {
    // Attempt MongoDB Connection with optimized pooling and fast timeout failover
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true
    });
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('Warning: Failed to connect to MongoDB. Starting server without DB:', error);
  }

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
