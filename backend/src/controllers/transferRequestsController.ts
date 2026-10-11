import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { User } from '../models/User';
import {
  OPEN_TRANSFER_STATUSES,
  TransferRequest,
  type TransferStatus,
} from '../models/TransferRequest';
import { sendError, sendSuccess } from '../utils/response';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';
import { ensureDefaultLevelsForCenter } from '../utils/centerLevels';
import { updateFilesMetadata } from '../utils/fileStorage';
import { optionalTrimmed, paramId } from '../utils/validation';
import { notifyUsers } from '../services/pushService';

type TransferLean = {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  fromCenterId: mongoose.Types.ObjectId;
  toCenterId: mongoose.Types.ObjectId;
  initiatedBy: string;
  reason?: string | null;
  status: string;
  rejectionReason?: string | null;
  toLevelId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

async function formatTransfers(items: TransferLean[], viewerCenterId?: mongoose.Types.ObjectId) {
  const studentIds = items.map((t) => t.studentId);
  const centerIds = items.flatMap((t) => [t.fromCenterId, t.toCenterId]);
  const [students, centers] = await Promise.all([
    Student.find({ _id: { $in: studentIds } })
      .select('fullName idNumber levelId track')
      .populate({ path: 'levelId', select: 'shortName fullName' })
      .lean(),
    Center.find({ _id: { $in: centerIds } }).select('nameAr').lean(),
  ]);
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
  const centerMap = new Map(centers.map((c) => [c._id.toString(), c.nameAr]));

  return items.map((t) => {
    const student = studentMap.get(t.studentId.toString());
    const level = student?.levelId as unknown as { shortName?: string; fullName?: string } | null;
    const isOutgoing = viewerCenterId ? t.fromCenterId.equals(viewerCenterId) : undefined;
    return {
      id: t._id.toString(),
      studentId: t.studentId.toString(),
      studentName: student?.fullName ?? '',
      studentIdNumber: student?.idNumber ?? '',
      studentLevelName: level?.shortName || level?.fullName || '',
      fromCenterId: t.fromCenterId.toString(),
      fromCenterName: centerMap.get(t.fromCenterId.toString()) ?? '',
      toCenterId: t.toCenterId.toString(),
      toCenterName: centerMap.get(t.toCenterId.toString()) ?? '',
      initiatedBy: t.initiatedBy,
      reason: t.reason ?? '',
      status: t.status,
      rejectionReason: t.rejectionReason ?? '',
      direction: isOutgoing === undefined ? undefined : isOutgoing ? 'outgoing' : 'incoming',
      createdAt: t.createdAt?.toISOString(),
      updatedAt: t.updatedAt?.toISOString(),
    };
  });
}

async function validateDestination(
  toCenterIdRaw: unknown,
  fromCenterId: mongoose.Types.ObjectId
): Promise<{ ok: true; center: { _id: mongoose.Types.ObjectId; genderAudience?: string | null } } | { ok: false; error: string }> {
  const toCenterId = typeof toCenterIdRaw === 'string' ? toCenterIdRaw.trim() : '';
  if (!mongoose.isValidObjectId(toCenterId)) return { ok: false, error: 'اختاري المركز المراد النقل إليه' };
  if (fromCenterId.equals(toCenterId)) return { ok: false, error: 'لا يمكن النقل إلى نفس المركز' };
  const center = await Center.findOne({ _id: toCenterId, status: 'active' }).select('genderAudience').lean();
  if (!center) return { ok: false, error: 'المركز المختار غير متاح' };
  return { ok: true, center };
}

async function hasOpenTransfer(studentId: mongoose.Types.ObjectId): Promise<boolean> {
  return !!(await TransferRequest.exists({ studentId, status: { $in: OPEN_TRANSFER_STATUSES } }));
}

/** المشرفة تنقل طالبة إلى مركز آخر — بانتظار قبول المركز الجديد */
export async function createTransferByCenter(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const studentId = typeof req.body?.studentId === 'string' ? req.body.studentId.trim() : '';
    if (!mongoose.isValidObjectId(studentId)) {
      sendError(res, 'معرّف الطالبة غير صالح', 400);
      return;
    }
    const student = await Student.findOne({
      _id: studentId,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }
    const destination = await validateDestination(req.body?.toCenterId, req.user.centerId);
    if (!destination.ok) {
      sendError(res, destination.error, 400);
      return;
    }
    if (destination.center.genderAudience && destination.center.genderAudience !== student.gender) {
      sendError(res, 'المركز المختار لا يناسب جنس الطالبة', 400);
      return;
    }
    if (await hasOpenTransfer(student._id)) {
      sendError(res, 'يوجد طلب نقل قيد المعالجة لهذه الطالبة', 409);
      return;
    }

    const transfer = await TransferRequest.create({
      studentId: student._id,
      fromCenterId: req.user.centerId,
      toCenterId: destination.center._id,
      initiatedBy: 'center',
      requestedByUserId: req.user._id,
      reason: optionalTrimmed(req.body?.reason, 500) ?? '',
      status: 'pending_destination',
      sourceReviewedBy: req.user._id,
      sourceReviewedAt: new Date(),
    });

    const [formatted] = await formatTransfers([transfer.toObject() as TransferLean], req.user.centerId);
    sendSuccess(res, { ...formatted, message: 'تم إرسال طلب النقل للمركز الجديد' }, 201);
  } catch (err) {
    console.error('[createTransferByCenter]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** الطالبة تطلب النقل — يذهب أولاً لمركزها الحالي */
export async function createTransferByStudent(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const student = await Student.findOne({
      _id: req.user.studentId,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على بيانات الطالبة', 404);
      return;
    }
    const destination = await validateDestination(req.body?.toCenterId, req.user.centerId);
    if (!destination.ok) {
      sendError(res, destination.error, 400);
      return;
    }
    if (destination.center.genderAudience && destination.center.genderAudience !== student.gender) {
      sendError(res, 'المركز المختار لا يناسبكِ', 400);
      return;
    }
    if (await hasOpenTransfer(student._id)) {
      sendError(res, 'لديكِ طلب نقل قيد المعالجة', 409);
      return;
    }
    const reason = optionalTrimmed(req.body?.reason, 500);
    if (!reason) {
      sendError(res, 'اكتبي سبب طلب النقل', 400);
      return;
    }

    const transfer = await TransferRequest.create({
      studentId: student._id,
      fromCenterId: req.user.centerId,
      toCenterId: destination.center._id,
      initiatedBy: 'student',
      requestedByUserId: req.user._id,
      reason,
      status: 'pending_source',
    });
    const [formatted] = await formatTransfers([transfer.toObject() as TransferLean]);
    sendSuccess(res, { ...formatted, message: 'تم إرسال طلب النقل — بانتظار موافقة مركزكِ' }, 201);
  } catch (err) {
    console.error('[createTransferByStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function listMyTransfers(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const items = (await TransferRequest.find({ studentId: req.user.studentId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()) as TransferLean[];
    sendSuccess(res, await formatTransfers(items));
  } catch (err) {
    console.error('[listMyTransfers]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** صندوق الطلبات: الوارد (للقبول) والصادر (للمتابعة/الموافقة على طلب طالبة) */
export async function listCenterTransfers(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const centerId = req.user.centerId;
    const scope = typeof req.query.scope === 'string' ? req.query.scope : 'open';
    const statusFilter =
      scope === 'all' ? {} : { status: { $in: OPEN_TRANSFER_STATUSES } };

    const items = (await TransferRequest.find({
      ...statusFilter,
      $or: [
        { fromCenterId: centerId },
        { toCenterId: centerId, status: { $ne: 'pending_source' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()) as TransferLean[];

    sendSuccess(res, await formatTransfers(items, centerId));
  } catch (err) {
    console.error('[listCenterTransfers]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

async function loadTransfer(req: Request, res: Response) {
  if (!req.user?.centerId) {
    sendError(res, 'غير مصرح', 403);
    return null;
  }
  const id = paramId(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 'معرّف الطلب غير صالح', 400);
    return null;
  }
  const transfer = await TransferRequest.findById(id);
  if (!transfer) {
    sendError(res, 'الطلب غير موجود', 404);
    return null;
  }
  return transfer;
}

async function notifyStudent(studentId: mongoose.Types.ObjectId, title: string, body: string, centerId: mongoose.Types.ObjectId) {
  const user = await User.findOne({ studentId, role: 'student' }).select('_id');
  if (!user) return;
  await notifyUsers([user._id], {
    type: 'transfer_updated',
    title,
    body,
    centerId,
    data: { studentId: studentId.toString() },
  });
}

/**
 * موافقة:
 * - المركز الحالي على طلب الطالبة ← يُحال للمركز الجديد
 * - المركز الجديد ← تُنقل الطالبة فعلياً (مع المستوى المقابل)
 */
export async function approveTransfer(req: Request, res: Response): Promise<void> {
  try {
    const transfer = await loadTransfer(req, res);
    if (!transfer || !req.user?.centerId) return;
    const centerId = req.user.centerId;

    if (transfer.status === 'pending_source') {
      if (!transfer.fromCenterId.equals(centerId)) {
        sendError(res, 'غير مصرح', 403);
        return;
      }
      transfer.status = 'pending_destination';
      transfer.sourceReviewedBy = req.user._id;
      transfer.sourceReviewedAt = new Date();
      await transfer.save();
      const [formatted] = await formatTransfers([transfer.toObject() as TransferLean], centerId);
      sendSuccess(res, { ...formatted, message: 'تمت الموافقة — أُحيل الطلب للمركز الجديد' });
      return;
    }

    if (transfer.status !== 'pending_destination' || !transfer.toCenterId.equals(centerId)) {
      sendError(res, 'لا يمكن معالجة هذا الطلب', 409);
      return;
    }

    const student = await Student.findOne({ _id: transfer.studentId, ...ACTIVE_STUDENT_FILTER });
    if (!student || !student.centerId.equals(transfer.fromCenterId)) {
      transfer.status = 'cancelled';
      await transfer.save();
      sendError(res, 'الطالبة لم تعد مسجلة في المركز المرسل', 409);
      return;
    }

    await ensureDefaultLevelsForCenter(centerId);

    // المستوى: من الطلب، أو المقابل لمستواها الحالي (نفس المسار والترتيب)
    let targetLevelId: mongoose.Types.ObjectId | null = null;
    const requestedLevel = typeof req.body?.levelId === 'string' ? req.body.levelId.trim() : '';
    if (requestedLevel) {
      if (!mongoose.isValidObjectId(requestedLevel)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      const level = await Level.findOne({ _id: requestedLevel, centerId });
      if (!level) {
        sendError(res, 'المستوى غير موجود في مركزكِ', 400);
        return;
      }
      targetLevelId = level._id;
      student.track = level.track ?? student.track;
    } else if (student.levelId) {
      const currentLevel = await Level.findById(student.levelId).lean();
      if (currentLevel) {
        const match = await Level.findOne({
          centerId,
          track: currentLevel.track ?? 'mutor',
          order: currentLevel.order,
        }).lean();
        targetLevelId = match?._id ?? null;
      }
    }

    const fromCenterId = student.centerId;
    student.centerId = centerId;
    student.levelId = targetLevelId;
    student.set('courseIds', []); // الدورات خاصة بكل مركز
    student.enrollmentStatus = 'enrolled';
    student.enrollmentHistory.push({
      action: 'transferred_in',
      reason: transfer.reason ?? '',
      meta: { fromCenterId: fromCenterId.toString(), toCenterId: centerId.toString() },
      by: req.user._id,
      at: new Date(),
    });
    await student.save();

    await User.updateMany({ studentId: student._id, role: 'student' }, { $set: { centerId } });
    await updateFilesMetadata(
      [student.documents?.civilId, student.documents?.photo, student.documents?.qualification],
      { centerId: centerId.toString() }
    );

    transfer.status = 'approved';
    transfer.toLevelId = targetLevelId;
    transfer.destinationReviewedBy = req.user._id;
    transfer.destinationReviewedAt = new Date();
    await transfer.save();

    const destination = await Center.findById(centerId).select('nameAr').lean();
    await notifyStudent(
      student._id,
      'تم نقلكِ بنجاح',
      `تم قبول نقلكِ إلى ${destination?.nameAr ?? 'المركز الجديد'}. سجّلي الدخول مجدداً لتحديث بياناتكِ.`,
      centerId
    );

    const [formatted] = await formatTransfers([transfer.toObject() as TransferLean], centerId);
    sendSuccess(res, { ...formatted, message: 'تم قبول الطالبة ونقلها إلى مركزكِ' });
  } catch (err) {
    console.error('[approveTransfer]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function rejectTransfer(req: Request, res: Response): Promise<void> {
  try {
    const transfer = await loadTransfer(req, res);
    if (!transfer || !req.user?.centerId) return;
    const centerId = req.user.centerId;

    const canReject =
      (transfer.status === 'pending_source' && transfer.fromCenterId.equals(centerId)) ||
      (transfer.status === 'pending_destination' && transfer.toCenterId.equals(centerId));
    if (!canReject) {
      sendError(res, 'لا يمكن معالجة هذا الطلب', 409);
      return;
    }

    const reason = optionalTrimmed(req.body?.reason, 500);
    if (!reason) {
      sendError(res, 'سبب الرفض مطلوب', 400);
      return;
    }

    transfer.status = 'rejected';
    transfer.rejectionReason = reason;
    if (transfer.toCenterId.equals(centerId)) {
      transfer.destinationReviewedBy = req.user._id;
      transfer.destinationReviewedAt = new Date();
    } else {
      transfer.sourceReviewedBy = req.user._id;
      transfer.sourceReviewedAt = new Date();
    }
    await transfer.save();

    await notifyStudent(transfer.studentId, 'تحديث على طلب النقل', `تم رفض طلب النقل: ${reason}`, centerId);

    const [formatted] = await formatTransfers([transfer.toObject() as TransferLean], centerId);
    sendSuccess(res, { ...formatted, message: 'تم رفض طلب النقل' });
  } catch (err) {
    console.error('[rejectTransfer]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** إلغاء الطلب من المركز المرسل أو من الطالبة نفسها */
export async function cancelTransfer(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }
    const transfer = await TransferRequest.findById(id);
    if (!transfer || !OPEN_TRANSFER_STATUSES.includes(transfer.status as TransferStatus)) {
      sendError(res, 'الطلب غير موجود أو تمت معالجته', 404);
      return;
    }
    const isOwnerStudent =
      req.user.role === 'student' && req.user.studentId?.equals(transfer.studentId);
    const isSourceCenter =
      req.user.role === 'center_admin' && req.user.centerId?.equals(transfer.fromCenterId);
    if (!isOwnerStudent && !isSourceCenter) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    transfer.status = 'cancelled';
    await transfer.save();
    sendSuccess(res, { id: transfer._id.toString(), status: transfer.status, message: 'تم إلغاء طلب النقل' });
  } catch (err) {
    console.error('[cancelTransfer]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
