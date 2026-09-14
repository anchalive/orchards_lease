import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toBool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

const normalizeOrigin = (value, fallback) => (value || fallback).replace(/\/$/, '');

const cookieDomain = (() => {
  const value = process.env.COOKIE_DOMAIN?.trim();
  if (!value || /^(localhost|127(?:\.\d{1,3}){3})$/i.test(value)) return undefined;
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
})();

const required = (key) => {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  isTest: process.env.NODE_ENV === 'test',

  port: toInt(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: normalizeOrigin(process.env.CLIENT_URL, 'http://localhost:5173'),
  adminUrl: normalizeOrigin(process.env.ADMIN_URL, 'http://localhost:5174'),

  db: {
    uri: required('MONGODB_URI') || 'mongodb://127.0.0.1:27017/orchardlease',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET') || 'dev_access_secret',
    refreshSecret: required('JWT_REFRESH_SECRET') || 'dev_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshExpiresInRemember: process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '30d',
    passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '30m',
    emailVerifyExpiresIn: process.env.EMAIL_VERIFY_EXPIRES_IN || '1d',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret',
    domain: cookieDomain,
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@orchardlease.com',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe_Admin123!',
    name: process.env.ADMIN_NAME || 'Platform Admin',
  },

  security: {
    bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
    rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 300),
    authRateLimitMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
    maxLoginAttempts: toInt(process.env.MAX_LOGIN_ATTEMPTS, 5),
    accountLockTimeMs: toInt(process.env.ACCOUNT_LOCK_TIME_MS, 15 * 60 * 1000),
  },

  upload: {
    provider: process.env.UPLOAD_PROVIDER || 'local',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'console',
    from: process.env.EMAIL_FROM || 'no-reply@orchardlease.com',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: toInt(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },

  features: {
    maintenanceMode: toBool(process.env.MAINTENANCE_MODE, false),
  },
};

export default config;
