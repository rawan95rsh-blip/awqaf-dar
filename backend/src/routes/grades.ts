import { Router } from 'express';
import { getGrades, saveGradesBulk } from '../controllers/gradesController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, authorize('center_admin'), getGrades);
router.post('/bulk', authenticate, authorize('center_admin'), saveGradesBulk);

export default router;
