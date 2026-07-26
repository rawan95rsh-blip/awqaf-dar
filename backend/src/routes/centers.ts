import { Router } from 'express';
import { getPublicCenters } from '../controllers/centersController';

const router = Router();

router.get('/public', getPublicCenters);

export default router;
