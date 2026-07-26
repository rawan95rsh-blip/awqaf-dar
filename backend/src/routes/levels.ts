import { Router } from 'express';
import {
  createLevel,
  getLevelById,
  getLevelsByCenter,
  getLevelStudents,
} from '../controllers/levelsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/', getLevelsByCenter);
router.post('/', authenticate, authorize('center_admin'), createLevel);
router.get(
  '/:levelId/students',
  authenticate,
  authorize('center_admin'),
  getLevelStudents
);
router.get('/:id', authenticate, authorize('center_admin'), getLevelById);

export default router;
