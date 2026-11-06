// Loads and validates environment variables once. In tests (NODE_ENV=test) the TEST_* database URLs are used.
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
  databaseUrl: isTest
    ? required('TEST_DATABASE_URL', 'postgres://energy_app:energy_app@localhost:5432/energy_audit_test')
    : required('DATABASE_URL', 'postgres://energy_app:energy_app@localhost:5432/energy_audit'),
  ownerDatabaseUrl: isTest
    ? required('TEST_OWNER_DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/energy_audit_test')
    : required('OWNER_DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/energy_audit'),
  appDbPassword: e.APP_DB_PASSWORD || 'energy_app',
  jwtSecret,
  jwtExpiresHours: Number(e.JWT_EXPIRES_HOURS || 8),
  uploadDir: path.resolve(e.UPLOAD_DIR || './uploads'),
  cookieSecure: e.COOKIE_SECURE === 'true',
  cookieSameSite: e.COOKIE_SAMESITE || 'lax',
  anomalyThreshold: Number(e.ANOMALY_THRESHOLD || 0.3),
  loginRateMax: Number(e.LOGIN_RATE_MAX || (isTest ? 1000 : 10)),
};
