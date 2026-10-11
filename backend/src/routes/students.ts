import { Router } from 'express';
import {
  createStudent,
  getCurrentStudent,
  getStudentById,
  listStudents,
  promoteStudent,
  reinstateStudent,
  suspendStudent,
  updateStudent,
  updateStudentEnrollmentStatus,
} from '../controllers/studentsController';
import { getStudentGrades } from '../controllers/gradesController';
import { getStudentAttendance } from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/authenticate';
import { documentsUpload } from '../middleware/upload';

const router = Router();

router.get('/me', authenticate, authorize('student'), getCurrentStudent);
router.get('/', authenticate, authorize('center_admin'), listStudents);
router.post('/', authenticate, authorize('center_admin'), documentsUpload, createStudent);
router.put('/:id', authenticate, authorize('center_admin'), documentsUpload, updateStudent);
router.post('/:id/suspend', authenticate, authorize('center_admin'), suspendStudent);
router.post('/:id/reinstate', authenticate, authorize('center_admin'), reinstateStudent);
router.patch('/:id/enrollment-status', authenticate, authorize('center_admin'), updateStudentEnrollmentStatus);
router.patch('/:id/promote', authenticate, authorize('center_admin'), promoteStudent);
router.get('/:id/grades', authenticate, authorize('center_admin', 'student'), getStudentGrades);
router.get('/:id/attendance', authenticate, authorize('center_admin', 'student'), getStudentAttendance);
router.get('/:id', authenticate, authorize('center_admin', 'student'), getStudentById);

export default router;
