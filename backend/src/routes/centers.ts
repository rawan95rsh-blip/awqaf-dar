import { Router } from 'express';
import { getPublicCenterCourses, getPublicCenters } from '../controllers/centersController';

const router = Router();

router.get('/public', getPublicCenters);
router.get('/:id/courses', getPublicCenterCourses);

export default router;
