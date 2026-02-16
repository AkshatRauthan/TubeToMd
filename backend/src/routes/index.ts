import express, { Router } from 'express';
import v1Routes from '@v1routes';

const router: Router = express.Router();


router.use('/v1', v1Routes);

export default router;