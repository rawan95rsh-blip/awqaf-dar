import { Router } from 'express';
import {
  createStudent,
  getCurrentStudent,
  getStudentById,
  listStudents,
  promoteStudent,
  updateStudentEnrollmentStatus,
} from '../controllers/studentsController';
import { getStudentGrades } from '../controllers/gradesController';
import { getStudentAttendance } from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/me', authenticate, authorize('student'), getCurrentStudent);
router.get('/', authenticate, authorize('center_admin'), listStudents);
router.post('/', authenticate, authorize('center_admin'), createStudent);
router.patch(
  '/:id/enrollment-status',
  authenticate,
  authorize('center_admin'),
  updateStudentEnrollmentStatus
);
router.patch(
  '/:id/promote',
  authenticate,
  authorize('center_admin'),
  promoteStudent
);
router.get(
  '/:id/grades',
  authenticate,
  authorize('center_admin', 'student'),
  getStudentGrades
);
router.get(
  '/:id/attendance',
  authenticate,
  authorize('center_admin', 'student'),
  getStudentAttendance
);
router.get(
  '/:id',
  authenticate,
  authorize('center_admin', 'student'),
  getStudentById
);

export default router;
