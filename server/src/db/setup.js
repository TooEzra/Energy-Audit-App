// Creates the indexes (incl. the unique ones). Idempotent. Run with `npm run db:setup` (the server also does it at start-up).
import { fileURLToPath } from 'node:url';
import { connect, ensureIndexes, closeMongo } from './mongo.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connect().then(ensureIndexes).then(() => console.log('MongoDB indexes ready')).catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(closeMongo);
}
