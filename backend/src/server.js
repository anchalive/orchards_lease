import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { sendOutstandingPaymentReminders } from './services/paymentReminder.service.js';

let server;

const start = async () => {
  try {
    await connectDB();
    server = app.listen(config.port, () => {
      logger.info(`🌳 OrchardLease API running in ${config.env} on port ${config.port}`);
      logger.info(`📚 API docs: http://localhost:${config.port}/api-docs`);
      logger.info(`🔗 Base URL: http://localhost:${config.port}${config.apiPrefix}`);
    });
    const reminderTimer = setInterval(() => sendOutstandingPaymentReminders(), 24 * 60 * 60 * 1000);
    reminderTimer.unref();
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.warn(`${signal} received — shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed');
      process.exit(0);
    });
    // force-exit if not closed in 10s
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

start();

export default app;
