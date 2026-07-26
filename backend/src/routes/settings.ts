import { Router } from 'express';
import {
  getCenterProfile,
  getGradeWeights,
  getSettings,
  updateCenterProfile,
  updateGradeWeights,
} from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, authorize('center_admin'), getSettings);
router.get('/center-profile', authenticate, authorize('center_admin'), getCenterProfile);
router.put('/center-profile', authenticate, authorize('center_admin'), updateCenterProfile);
router.get('/grade-weights', authenticate, authorize('center_admin'), getGradeWeights);
router.put('/grade-weights', authenticate, authorize('center_admin'), updateGradeWeights);

export default router;
