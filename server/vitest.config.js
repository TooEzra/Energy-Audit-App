import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', UPLOAD_DIR: './uploads-test' },
    globalSetup: ['./tests/helpers/globalSetup.js'],
    // API/isolation tests share one test database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
