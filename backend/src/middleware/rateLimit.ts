import rateLimit from 'express-rate-limit';

/** حد محاولات الدخول — يخفف التخمين على login */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'محاولات دخول كثيرة — حاولي لاحقاً',
  },
});

/** حد أخف لتسجيل/تحقق المركز */
export const authWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'طلبات كثيرة — حاولي لاحقاً',
  },
});
