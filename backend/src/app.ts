import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';

import apiRoutes from "@routes";
import { corsConfig } from "@config";
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

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;