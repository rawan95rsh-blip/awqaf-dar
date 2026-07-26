import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendError } from '../utils/response';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[errorHandler]', err);

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    sendError(res, messages.join(', '), 400);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    sendError(res, 'معرّف غير صالح', 400);
    return;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    sendError(res, 'البيانات موجودة مسبقاً', 409);
    return;
  }

  sendError(res, 'حدث خطأ في الخادم', 500);
}
