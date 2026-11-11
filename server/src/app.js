import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { cors } from './middleware/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
// 'loopback' locally (Vite proxy); set TRUST_PROXY=1 on a host such as Render so the rate limiter sees real client IPs.
app.set('trust proxy', /^\d+$/.test(env.trustProxy) ? Number(env.trustProxy) : env.trustProxy);
app.use(cors);
app.use(express.json({ limit: '1.5mb' }));
app.use(cookieParser());
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
