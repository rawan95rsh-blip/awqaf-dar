import { Router } from 'express';
import { login, registerCenter, resendCenterCode, verifyCenter } from '../controllers/authController';
import {
  authWriteRateLimiter,
  loginRateLimiter,
} from '../middleware/rateLimit';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/register-center', authWriteRateLimiter, registerCenter);
router.post('/verify-center', authWriteRateLimiter, verifyCenter);
router.post('/resend-code', authWriteRateLimiter, resendCenterCode);

export default router;
