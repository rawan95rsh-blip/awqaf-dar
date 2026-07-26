import { Router } from 'express';
import {
  cancelSession,
  createSession,
  deleteSession,
  getSessionById,
  listMySessions,
  listSessions,
  updateSession,
} from '../controllers/sessionsController';
import {
  checkInToSession,
  getMySessionAttendance,
} from '../controllers/sessionAttendanceController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/me', authorize('student'), listMySessions);

router.get('/', authorize('center_admin'), listSessions);
router.post('/', authorize('center_admin'), createSession);

router.get('/:id/attendance/me', authorize('student'), getMySessionAttendance);
router.post('/:id/check-in', authorize('student'), checkInToSession);
router.post('/:id/cancel', authorize('center_admin'), cancelSession);

router.get('/:id', authorize('center_admin', 'student'), getSessionById);
router.put('/:id', authorize('center_admin'), updateSession);
router.delete('/:id', authorize('center_admin'), deleteSession);

export default router;
