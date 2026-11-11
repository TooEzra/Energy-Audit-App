import fs from 'node:fs';
import app from './app.js';
import { env } from './config/env.js';
import { connect, ensureIndexes, closeMongo } from './db/mongo.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

try {
  await connect();
  await ensureIndexes();
} catch (err) {
  console.error(`Cannot connect to MongoDB at ${env.mongoUri} (database "${env.mongoDb}"): ${err.message}`);
  console.error('Start MongoDB (or fix MONGODB_URI in server/.env) and try again.');
  process.exit(1);
}

const server = app.listen(env.port, () => console.log(`Energy Audit API listening on http://localhost:${env.port}/api`));

const shutdown = () => server.close(async () => { await closeMongo(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
