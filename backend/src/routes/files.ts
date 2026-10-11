import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/authenticate';
import { findFile, streamFile } from '../utils/fileStorage';
import { sendError } from '../utils/response';
import { paramId } from '../utils/validation';

const router = Router();

/** عرض المرفق: لمشرفة نفس المركز، أو للطالبة صاحبة الملف */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الملف غير صالح', 400);
      return;
    }
    const objectId = new mongoose.Types.ObjectId(id);
    const file = await findFile(objectId);
    if (!file) {
      sendError(res, 'الملف غير موجود', 404);
      return;
    }
    const meta = (file.metadata ?? {}) as { centerId?: string; studentId?: string };
    const user = req.user;
    const allowed =
      (user?.role === 'center_admin' && !!user.centerId && meta.centerId === user.centerId.toString()) ||
      (user?.role === 'student' && !!user.studentId && meta.studentId === user.studentId.toString());
    if (!allowed) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    await streamFile(objectId, res);
  } catch (err) {
    console.error('[getFile]', err);
    if (!res.headersSent) sendError(res, 'تعذر تحميل الملف', 500);
  }
});

export default router;
