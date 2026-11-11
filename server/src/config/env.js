// Loads and validates environment variables once. In tests (NODE_ENV=test) the separate test database is used.
import 'dotenv/config';
import path from 'node:path';

const isTest = process.env.NODE_ENV === 'test';
const e = process.env;

function required(name, fallback) {
  const v = e[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return v;
}

const jwtSecret = required('JWT_SECRET', isTest ? 'test-secret-test-secret-test-secret' : undefined);
if (jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters');

export const env = {
  nodeEnv: e.NODE_ENV || 'development',
  isTest,
  port: Number(e.PORT || 4000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
  // Tests use their own database (never the real one): its name must end in _test.
  mongoDb: isTest ? (e.TEST_MONGODB_DB || 'energy_audit_test') : required('MONGODB_DB', 'energy_audit'),
  jwtSecret,
  jwtExpiresHours: Number(e.JWT_EXPIRES_HOURS || 8),
  uploadDir: path.resolve(e.UPLOAD_DIR || './uploads'),
  // Comma-separated list of front-end origins allowed to call the API from another domain, e.g. https://wattcheck-three.vercel.app
  clientOrigins: (e.CLIENT_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
  trustProxy: e.TRUST_PROXY || 'loopback',
  cookieSecure: e.COOKIE_SECURE === 'true',
  cookieSameSite: e.COOKIE_SAMESITE || 'lax',
  anomalyThreshold: Number(e.ANOMALY_THRESHOLD || 0.3),
  loginRateMax: Number(e.LOGIN_RATE_MAX || (isTest ? 1000 : 10)),
};
