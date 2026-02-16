import express, { Application } from 'express';

import apiRoutes from "@routes";
import { corsConfig } from "@config";
import { errorHandler } from '@errors';

const app: Application = express();

app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;