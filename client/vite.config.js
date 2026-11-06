import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: the React app only calls relative /api/... URLs; Vite forwards them to Express on port 4000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } } },
});
