import { Router } from 'express';
import { getAttendance, saveAttendanceBulk } from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, authorize('center_admin'), getAttendance);
router.post('/bulk', authenticate, authorize('center_admin'), saveAttendanceBulk);

export default router;
