import { Router } from 'express';
import {
  getAccount,
  updateAccount,
  changePassword,
} from '../controllers/accountController';
import { authenticate, authorize } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getAccount);
router.put('/', authenticate, authorize('center_admin'), updateAccount);
router.put('/password', authenticate, changePassword);

export default router;
