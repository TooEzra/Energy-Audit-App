// Runs once before the test files: makes sure the (separate) test database has its indexes.
process.env.NODE_ENV = 'test';

export default async function setup() {
  const { env } = await import('../../src/config/env.js');
  if (!/_test$/.test(env.mongoDb)) throw new Error(`Refusing to run tests against "${env.mongoDb}": the test database name must end in _test`);
  const { connect, ensureIndexes, closeMongo } = await import('../../src/db/mongo.js');
  await connect();
  await ensureIndexes();
  await closeMongo();
}
