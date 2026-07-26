import { Router } from 'express';
import {
  approveSuspensionRequest,
  listSuspensionRequests,
  rejectSuspensionRequest,
  submitSuspensionRequest,
} from '../controllers/suspensionRequestsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, authorize('student'), submitSuspensionRequest);
router.get('/', authenticate, authorize('center_admin'), listSuspensionRequests);
router.patch(
  '/:id/approve',
  authenticate,
  authorize('center_admin'),
  approveSuspensionRequest
);
router.patch(
  '/:id/reject',
  authenticate,
  authorize('center_admin'),
  rejectSuspensionRequest
);

export default router;
