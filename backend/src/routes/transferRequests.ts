import { Router } from 'express';
import {
  approveTransfer,
  cancelTransfer,
  createTransferByCenter,
  createTransferByStudent,
  listCenterTransfers,
  listMyTransfers,
  rejectTransfer,
} from '../controllers/transferRequestsController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/me', authorize('student'), listMyTransfers);
router.post('/me', authorize('student'), createTransferByStudent);

router.get('/', authorize('center_admin'), listCenterTransfers);
router.post('/', authorize('center_admin'), createTransferByCenter);
router.patch('/:id/approve', authorize('center_admin'), approveTransfer);
router.patch('/:id/reject', authorize('center_admin'), rejectTransfer);
router.patch('/:id/cancel', authorize('center_admin', 'student'), cancelTransfer);

export default router;
