import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // correct client IPs for the login rate limiter behind a local proxy (Vite)
app.use(express.json({ limit: '1.5mb' }));
app.use(cookieParser());
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
