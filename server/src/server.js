import fs from 'node:fs';
import app from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

fs.mkdirSync(env.uploadDir, { recursive: true });
const server = app.listen(env.port, () => console.log(`Energy Audit API listening on http://localhost:${env.port}/api`));

const shutdown = () => server.close(async () => { await closePool(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
