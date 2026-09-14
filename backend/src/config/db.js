import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';

mongoose.set('strictQuery', true);

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return mongoose.connection;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const conn = await mongoose.connect(config.db.uri, {
        autoIndex: !config.isProd,
        serverSelectionTimeoutMS: 10000,
      });

      isConnected = true;
      logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB disconnected');
      });

      return conn.connection;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 2000));
      else throw err;
    }
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (err) {
    isConnected = false;
    logger.warn(`Error while disconnecting MongoDB: ${err.message}`);
  }
};

export default connectDB;
