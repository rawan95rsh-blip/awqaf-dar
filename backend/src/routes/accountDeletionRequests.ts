import { Router } from 'express';
import {
  approveAccountDeletionRequest,
  listAccountDeletionRequests,
  rejectAccountDeletionRequest,
  submitAccountDeletionRequest,
} from '../controllers/accountDeletionRequestsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, authorize('student'), submitAccountDeletionRequest);
router.get(
  '/',
  authenticate,
  authorize('center_admin'),
  listAccountDeletionRequests
);
router.patch(
  '/:id/approve',
  authenticate,
  authorize('center_admin'),
  approveAccountDeletionRequest
);
router.patch(
  '/:id/reject',
  authenticate,
  authorize('center_admin'),
  rejectAccountDeletionRequest
);

export default router;
