import { Router } from 'express';
import {
  approveRegistrationRequest,
  getRegistrationRequest,
  listRegistrationRequests,
  rejectRegistrationRequest,
  submitRegistrationRequest,
} from '../controllers/registrationRequestsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.post('/', submitRegistrationRequest);

router.get('/', authenticate, authorize('center_admin'), listRegistrationRequests);
router.get('/:id', authenticate, authorize('center_admin'), getRegistrationRequest);
router.patch('/:id/approve', authenticate, authorize('center_admin'), approveRegistrationRequest);
router.patch('/:id/reject', authenticate, authorize('center_admin'), rejectRegistrationRequest);

export default router;
