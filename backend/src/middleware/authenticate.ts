import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { sendError } from '../utils/response';
import { verifyToken } from '../utils/token';
import type { AuthUser } from '../types/express';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      sendError(res, 'يجب تسجيل الدخول', 401);
      return;
    }

    const token = header.slice(7);
    const payload = verifyToken(token);

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      sendError(res, 'جلسة غير صالحة', 401);
      return;
    }

    const authUser: AuthUser = {
      _id: user._id,
      phone: user.phone,
      role: user.role,
      centerId: user.centerId ?? undefined,
      studentId: user.studentId ?? undefined,
      isActive: user.isActive,
      email: user.email ?? undefined,
    };

    req.user = authUser;
    next();
  } catch {
    sendError(res, 'جلسة غير صالحة', 401);
  }
}

export function authorize(...roles: Array<'center_admin' | 'student'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    next();
  };
}
