import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import config from './config/index.js';
import { httpStream } from './config/logger.js';
import swaggerSpec from './config/swagger.js';

import routes from './routes/index.js';
import { sanitizeBody } from './middleware/sanitize.middleware.js';
import { maintenanceGuard } from './middleware/maintenance.middleware.js';
import { optionalAuth } from './middleware/auth.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { healthCheck } from './controllers/meta.controller.js';

// Resolve __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ----------------------------- Security ---------------------------- */
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl, config.adminUrl],
    credentials: true,
  })
);

/* ----------------------------- Parsers ----------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookie.secret));

/* --------------------------- Static Files --------------------------- */
// Serve static uploads (for uploaded Garden, Tree, Fruit images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* --------------------------- Hardening ----------------------------- */
app.use(mongoSanitize());
app.use(hpp());
app.use(sanitizeBody);
app.use(compression());

/* ----------------------------- Logging ----------------------------- */
if (!config.isTest) {
  app.use(morgan(config.isProd ? 'combined' : 'dev', { stream: httpStream }));
}

/* --------------------------- Health & docs ------------------------- */
app.get('/health', healthCheck);
app.get(`${config.apiPrefix}/health`, healthCheck);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { customSiteTitle: 'OrchardLease API Docs' })
);
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

/* ------------------------------ Routes ----------------------------- */
app.use(config.apiPrefix, apiLimiter, optionalAuth, maintenanceGuard, routes);

/* ----------------------------- Errors ------------------------------ */
app.use(notFound);
app.use(errorHandler);

export default app;
