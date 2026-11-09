import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');

// Render (and most hosts) sit behind a reverse proxy
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://wattcheck-three.vercel.app',
  // Add your real frontend URL(s):
  process.env.FRONTEND_URL, // e.g. https://your-app.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header) and listed frontends
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true, // required for httpOnly cookie auth
  })
);

app.use(express.json({ limit: '1.5mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: 'Energy Audit API',
    health: '/api/health',
  });
});

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;