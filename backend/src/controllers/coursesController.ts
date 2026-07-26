import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course';
import { ClassOffer } from '../models/ClassOffer';
import { Session } from '../models/Session';
import { sendError, sendSuccess } from '../utils/response';

function formatCourse(course: {
  _id: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  name: string;
  description?: string | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: course._id.toString(),
    centerId: course.centerId.toString(),
    name: course.name,
    description: course.description ?? undefined,
    createdBy: course.createdBy.toString(),
    createdAt: course.createdAt?.toISOString(),
    updatedAt: course.updatedAt?.toISOString(),
  };
}

export async function listCourses(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const courses = await Course.find({ centerId: req.user.centerId })
      .sort({ createdAt: -1 })
      .lean();
    sendSuccess(
      res,
      courses.map((course) => formatCourse(course))
    );
  } catch (err) {
    console.error('[listCourses]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الدورة غير صالح', 400);
      return;
    }

    const course = await Course.findOne({ _id: id, centerId: req.user.centerId }).lean();
    if (!course) {
      sendError(res, 'الدورة غير موجودة', 404);
      return;
    }

    sendSuccess(res, formatCourse(course));
  } catch (err) {
    console.error('[getCourseById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId || !req.user._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 'اسم الدورة العلمية مطلوب', 400);
      return;
    }
    if (name.trim().length > 120) {
      sendError(res, 'اسم الدورة طويل جداً', 400);
      return;
    }

    let desc: string | undefined;
    if (description !== undefined) {
      if (typeof description !== 'string') {
        sendError(res, 'الوصف غير صالح', 400);
        return;
      }
      const trimmed = description.trim();
      if (trimmed.length > 500) {
        sendError(res, 'الوصف طويل جداً', 400);
        return;
      }
      desc = trimmed || undefined;
    }

    const course = await Course.create({
      centerId: req.user.centerId,
      name: name.trim(),
      description: desc,
      createdBy: req.user._id,
    });

    sendSuccess(res, formatCourse(course), 201);
  } catch (err) {
    console.error('[createCourse]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الدورة غير صالح', 400);
      return;
    }

    const course = await Course.findOne({ _id: id, centerId: req.user.centerId });
    if (!course) {
      sendError(res, 'الدورة غير موجودة', 404);
      return;
    }

    const { name, description } = req.body as {
      name?: string;
      description?: string | null;
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        sendError(res, 'اسم الدورة العلمية مطلوب', 400);
        return;
      }
      if (name.trim().length > 120) {
        sendError(res, 'اسم الدورة طويل جداً', 400);
        return;
      }
      course.name = name.trim();
    }

    if (description !== undefined) {
      if (description === null || description === '') {
        course.description = undefined;
      } else if (typeof description === 'string') {
        const trimmed = description.trim();
        if (trimmed.length > 500) {
          sendError(res, 'الوصف طويل جداً', 400);
          return;
        }
        course.description = trimmed || undefined;
      } else {
        sendError(res, 'الوصف غير صالح', 400);
        return;
      }
    }

    await course.save();
    sendSuccess(res, {
      ...formatCourse(course),
      message: 'تم تحديث الدورة بنجاح',
    });
  } catch (err) {
    console.error('[updateCourse]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الدورة غير صالح', 400);
      return;
    }

    const course = await Course.findOneAndDelete({
      _id: id,
      centerId: req.user.centerId,
    });
    if (!course) {
      sendError(res, 'الدورة غير موجودة', 404);
      return;
    }

    const offers = await ClassOffer.find({
      centerId: req.user.centerId,
      courseId: course._id,
    }).select('_id');
    const offerIds = offers.map((o) => o._id);
    if (offerIds.length > 0) {
      await Session.deleteMany({
        centerId: req.user.centerId,
        classOfferId: { $in: offerIds },
      });
      await ClassOffer.deleteMany({ _id: { $in: offerIds } });
    }

    sendSuccess(res, {
      id: course._id.toString(),
      message: 'تم حذف الدورة العلمية بنجاح',
    });
  } catch (err) {
    console.error('[deleteCourse]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
