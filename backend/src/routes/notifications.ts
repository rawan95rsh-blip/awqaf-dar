import { Router } from 'express';
import {
  listMyNotifications,
  markNotificationRead,
} from '../controllers/notificationsController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);
router.get('/me', listMyNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
