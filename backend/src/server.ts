import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/forge-connect';

async function startServer() {
  try {
    // Attempt MongoDB Connection
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');
    
    // Database connected
  } catch (error) {
    console.error('Warning: Failed to connect to MongoDB. Starting server without DB:', error);
  }

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
