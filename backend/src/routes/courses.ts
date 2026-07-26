import { Router } from 'express';
import {
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  updateCourse,
} from '../controllers/coursesController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.use(authenticate, authorize('center_admin'));

router.get('/', listCourses);
router.post('/', createCourse);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
