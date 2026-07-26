import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { sendError, sendSuccess } from '../utils/response';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';

function formatDeletionRequest(request: {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reason?: string | null;
  status: string;
  rejectionReason?: string | null;
  createdAt?: Date;
  studentName?: string;
  studentIdNumber?: string;
}) {
  return {
    id: request._id.toString(),
    studentId: request.studentId.toString(),
    centerId: request.centerId.toString(),
    userId: request.userId.toString(),
    reason: request.reason ?? undefined,
    status: request.status,
    rejectionReason: request.rejectionReason ?? undefined,
    studentName: request.studentName,
    studentIdNumber: request.studentIdNumber,
    createdAt: request.createdAt?.toISOString(),
  };
}

/** الطالبة تطلب حذفاً كلياً من مركزها الحالي */
export async function submitAccountDeletionRequest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    const student = await Student.findOne({
      _id: req.user.studentId,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على بيانات الطالبة', 404);
      return;
    }

    const pending = await AccountDeletionRequest.findOne({
      studentId: student._id,
      status: 'pending',
    });
    if (pending) {
      sendError(res, 'يوجد طلب حذف كلي معلق', 409);
      return;
    }

    const request = await AccountDeletionRequest.create({
      studentId: student._id,
      centerId: student.centerId,
      userId: req.user._id,
      reason: reason || undefined,
      status: 'pending',
    });

    sendSuccess(
      res,
      {
        id: request._id.toString(),
        message: 'تم إرسال طلب الحذف الكلي — بانتظار موافقة المركز',
        status: request.status,
      },
      201
    );
  } catch (err) {
    console.error('[submitAccountDeletionRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function listAccountDeletionRequests(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.centerId || req.user.role !== 'center_admin') {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const status =
      typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim()
        : 'pending';

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      sendError(res, 'حالة الطلب غير صالحة', 400);
      return;
    }

    const requests = await AccountDeletionRequest.find({
      centerId: req.user.centerId,
      status,
    } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean();

    const studentIds = requests.map((r) => r.studentId);
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('fullName idNumber')
      .lean();
    const studentMap = new Map(
      students.map((s) => [s._id.toString(), s] as const)
    );

    sendSuccess(
      res,
      requests.map((request) => {
        const student = studentMap.get(request.studentId.toString());
        return formatDeletionRequest({
          ...request,
          studentName: student?.fullName,
          studentIdNumber: student?.idNumber,
        });
      })
    );
  } catch (err) {
    console.error('[listAccountDeletionRequests]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function approveAccountDeletionRequest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.centerId || req.user.role !== 'center_admin') {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const request = await AccountDeletionRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
      status: 'pending',
    });
    if (!request) {
      sendError(res, 'الطلب غير موجود أو تمت معالجته', 404);
      return;
    }

    const student = await Student.findOne({
      _id: request.studentId,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    const user = await User.findOne({
      studentId: student._id,
      role: 'student',
    });

    const now = new Date();
    student.deletedAt = now;
    await student.save();

    if (user) {
      user.isActive = false;
      // تحرير رقم الهاتف لإعادة التسجيل لاحقاً
      user.phone = `deleted_${now.getTime()}_${user.phone}`;
      await user.save();
    }

    request.status = 'approved';
    request.reviewedAt = now;
    request.reviewedBy = req.user._id;
    await request.save();

    sendSuccess(res, {
      id: request._id.toString(),
      studentId: student._id.toString(),
      message: 'تمت الموافقة على الحذف الكلي — يمكن للهوية التسجيل في مركز آخر',
    });
  } catch (err) {
    console.error('[approveAccountDeletionRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function rejectAccountDeletionRequest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.centerId || req.user.role !== 'center_admin') {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    const request = await AccountDeletionRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
      status: 'pending',
    });
    if (!request) {
      sendError(res, 'الطلب غير موجود أو تمت معالجته', 404);
      return;
    }

    request.status = 'rejected';
    request.rejectionReason = reason || undefined;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    sendSuccess(res, {
      id: request._id.toString(),
      status: request.status,
      message: 'تم رفض طلب الحذف الكلي',
    });
  } catch (err) {
    console.error('[rejectAccountDeletionRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
