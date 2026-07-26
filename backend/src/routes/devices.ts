import { Router } from 'express';
import {
  registerDevice,
  unregisterMyDevices,
} from '../controllers/devicesController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);
router.post('/register', registerDevice);
router.delete('/me', unregisterMyDevices);

export default router;
