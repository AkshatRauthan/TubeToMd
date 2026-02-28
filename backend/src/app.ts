import express, { Application } from 'express';

import apiRoutes from "@routes";
import { corsConfig } from "@config";
import { errorHandler } from '@errors';
import apiLogger from '@common/api.logger';

const app: Application = express();

app.use(corsConfig);
app.use(apiLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;