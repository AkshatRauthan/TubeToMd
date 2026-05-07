import express, { Application } from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';

import apiRoutes from "@routes";
import { corsConfig } from "@config";
import serverConfig from '@config/server.config';
import { errorHandler } from '@errors';
import apiLogger from '@common/api.logger';

const app: Application = express();

import { globalLimiter, aiLimiter } from '@middlewares/rateLimiter.middleware';

// ─── Middleware Stack ────────────────────────────────────────────────────────

app.use(corsConfig);
app.use(apiLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', globalLimiter);

// Serve generated images and other uploads
app.use('/uploads', express.static(path.resolve(serverConfig.UPLOAD_DIR)));

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;