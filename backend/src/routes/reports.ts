import { Router } from 'express';
import { getAttendanceReport, getGradesheet } from '../controllers/reportsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.use(authenticate, authorize('center_admin'));
router.get('/gradesheet', getGradesheet);
router.get('/attendance', getAttendanceReport);

export default router;
