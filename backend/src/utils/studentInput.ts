import mongoose from 'mongoose';
import type { Request } from 'express';
import {
  isOccupation,
  isStudentType,
  isValidAcademicLevel,
  isValidNationality,
  NOTES_MAX_LENGTH,
  type AcademicLevel,
  type HomeAddress,
  type NationalityCode,
  type Occupation,
  type StudentType,
} from '../constants/registration';
import { isStudentGender, type StudentGender } from '../constants/genderAudience';
import { isStudentTrack, trackRequiresLevel, type StudentTrack } from '../constants/tracks';
import { Level } from '../models/Level';
import { Course } from '../models/Course';
import { DOCUMENT_KINDS, type DocumentKind } from '../models/shared';
import { getUploadedDocuments } from '../middleware/upload';
import { saveFile, type FileMeta } from './fileStorage';
import { parsePhoneInput } from './phone';
import { isKuwaitCivilId, KUWAIT_CIVIL_ID_ERROR_AR, normalizeIdNumber } from './idNumber';
import { optionalTrimmed, parseDateOnly, parseObject, parseStringArray } from './validation';

export type StudentInput = {
  fullName: string;
  idNumber: string;
  gender: StudentGender;
  nationality: NationalityCode;
  academicLevel: AcademicLevel;
  track: StudentTrack;
  trackNote: string;
  phone: string;
  dob: Date;
  levelId: string | null;
  courseIds: string[];
  occupation: Occupation;
  occupationOther: string;
  studentType: StudentType;
  homeAddress: HomeAddress;
  notes: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function fail<T>(error: string): Result<T> {
  return { ok: false, error };
}

function parseAddress(raw: unknown): HomeAddress | null {
  const obj = parseObject(raw);
  if (!obj) return null;
  return {
    area: optionalTrimmed(obj.area, 80) ?? '',
    block: optionalTrimmed(obj.block, 20) ?? '',
    street: optionalTrimmed(obj.street, 80) ?? '',
    avenue: optionalTrimmed(obj.avenue, 40) ?? '',
    house: optionalTrimmed(obj.house, 40) ?? '',
  };
}

/**
 * يتحقق من بيانات الطالبة (تسجيل ذاتي / إضافة يدوية / تعديل).
 * partial=true: يُتحقق فقط من الحقول المرسلة (للتعديل).
 */
export function parseStudentInput(
  body: Record<string, unknown>,
  options: { partial?: boolean; requireExtended?: boolean } = {}
): Result<Partial<StudentInput>> {
  const partial = options.partial ?? false;
  const requireExtended = options.requireExtended ?? true;
  const has = (key: string) => body[key] !== undefined && body[key] !== null && body[key] !== '';
  const out: Partial<StudentInput> = {};

  if (!partial || has('fullName')) {
    const fullName = optionalTrimmed(body.fullName, 120);
    if (!fullName) return fail('الاسم الكامل مطلوب');
    if (fullName.length < 3) return fail('الاسم قصير جداً');
    out.fullName = fullName;
  }

  if (!partial || has('idNumber')) {
    if (typeof body.idNumber !== 'string') return fail('الرقم المدني مطلوب');
    const normalized = normalizeIdNumber(body.idNumber);
    if (!isKuwaitCivilId(normalized)) return fail(KUWAIT_CIVIL_ID_ERROR_AR);
    out.idNumber = normalized;
  }

  if (!partial || has('gender')) {
    if (!isStudentGender(body.gender)) return fail('الجنس مطلوب');
    out.gender = body.gender;
  }

  if (!partial || has('nationality')) {
    if (!isValidNationality(body.nationality)) return fail('الجنسية غير صالحة');
    out.nationality = body.nationality;
  }

  if (!partial || has('academicLevel')) {
    if (!isValidAcademicLevel(body.academicLevel)) return fail('المؤهل الدراسي غير صالح');
    out.academicLevel = body.academicLevel;
  }

  if (!partial || has('track')) {
    if (!isStudentTrack(body.track)) {
      return fail('مسار الانضمام مطلوب — تمهيدي أو مطور أو دورات أو أخرى');
    }
    out.track = body.track;
    out.trackNote = optionalTrimmed(body.trackNote, 200) ?? '';
    if (body.track === 'other' && !out.trackNote && requireExtended) {
      return fail('وضّحي مسار الانضمام عند اختيار «أخرى»');
    }
  }

  if (!partial || has('phone')) {
    const parsed = parsePhoneInput(body.phone, body.countryCode);
    if (!parsed.ok) return fail(parsed.error);
    out.phone = parsed.phone;
  }

  if (!partial || has('dob')) {
    const dob = parseDateOnly(body.dob);
    if (!dob) return fail('تاريخ الميلاد غير صالح');
    if (dob.getTime() > Date.now()) return fail('تاريخ الميلاد لا يمكن أن يكون في المستقبل');
    out.dob = dob;
  }

  const levelKeyPresent = 'levelId' in body || 'requestedLevelId' in body;
  if (!partial || levelKeyPresent) {
    const raw = body.levelId ?? body.requestedLevelId;
    out.levelId = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }

  if (!partial || body.courseIds !== undefined) {
    out.courseIds = parseStringArray(body.courseIds);
  }

  if (!partial || has('occupation')) {
    if (has('occupation') || requireExtended) {
      if (!isOccupation(body.occupation)) return fail('اختاري الوظيفة الحالية');
      out.occupation = body.occupation;
      out.occupationOther = optionalTrimmed(body.occupationOther, 80) ?? '';
      if (body.occupation === 'other' && !out.occupationOther) {
        return fail('اكتبي الوظيفة الحالية');
      }
    }
  }

  if (!partial || has('studentType')) {
    if (has('studentType') || requireExtended) {
      if (!isStudentType(body.studentType)) return fail('حدّدي: مستجدة أم مستمرة');
      out.studentType = body.studentType;
    }
  }

  if (!partial || body.homeAddress !== undefined) {
    const address = parseAddress(body.homeAddress);
    if (requireExtended && !partial && (!address || !address.area)) {
      return fail('عنوان السكن مطلوب — اكتبي المنطقة على الأقل');
    }
    if (address) out.homeAddress = address;
  }

  if (!partial || body.notes !== undefined) {
    out.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, NOTES_MAX_LENGTH) : '';
  }

  return { ok: true, value: out };
}

/** يتحقق أن المستوى والدورات تابعة للمركز ومتوافقة مع المسار */
export async function resolvePlacement(
  centerId: mongoose.Types.ObjectId,
  track: StudentTrack,
  levelId: string | null | undefined,
  courseIds: string[] | undefined
): Promise<
  Result<{ levelId: mongoose.Types.ObjectId | null; courseIds: mongoose.Types.ObjectId[] }>
> {
  let levelObjectId: mongoose.Types.ObjectId | null = null;

  if (trackRequiresLevel(track)) {
    if (!levelId || !mongoose.isValidObjectId(levelId)) {
      return fail(track === 'preparatory' ? 'اختاري مستوى التمهيدي' : 'اختاري مستوى المطور');
    }
    const level = await Level.findOne({ _id: levelId, centerId }).lean();
    if (!level) return fail('المستوى غير موجود في هذا المركز');
    if ((level.track ?? 'mutor') !== track) {
      return fail('المستوى المختار لا يتبع مسار الانضمام');
    }
    levelObjectId = level._id;
  } else if (levelId && mongoose.isValidObjectId(levelId)) {
    // مسار دورات/أخرى مع مستوى اختياري
    const level = await Level.findOne({ _id: levelId, centerId }).lean();
    if (level) levelObjectId = level._id;
  }

  const ids = (courseIds ?? []).filter((id) => mongoose.isValidObjectId(id));
  let courseObjectIds: mongoose.Types.ObjectId[] = [];
  if (ids.length) {
    const courses = await Course.find({ _id: { $in: ids }, centerId }).select('_id').lean();
    if (courses.length !== new Set(ids).size) return fail('إحدى الدورات المختارة غير متاحة في هذا المركز');
    courseObjectIds = courses.map((course) => course._id);
  }

  if (track === 'courses' && courseObjectIds.length === 0) {
    return fail('اختاري دورة واحدة على الأقل لمسار الدورات');
  }

  return { ok: true, value: { levelId: levelObjectId, courseIds: courseObjectIds } };
}

export type StoredDocuments = Partial<Record<DocumentKind, mongoose.Types.ObjectId>>;

/** يحفظ المرفقات المرفوعة في GridFS ويعيد معرّفاتها */
export async function storeUploadedDocuments(
  req: Request,
  meta: Omit<FileMeta, 'kind'>
): Promise<StoredDocuments> {
  const uploaded = getUploadedDocuments(req);
  const stored: StoredDocuments = {};
  for (const kind of DOCUMENT_KINDS) {
    const file = uploaded[kind]?.[0];
    if (!file) continue;
    stored[kind] = await saveFile(file.buffer, file.mimetype, file.originalname || `${kind}.jpg`, {
      ...meta,
      kind,
    });
  }
  return stored;
}

export function missingRequiredDocuments(
  docs: StoredDocuments,
  academicLevel: AcademicLevel | undefined
): DocumentKind[] {
  const missing: DocumentKind[] = [];
  if (!docs.civilId) missing.push('civilId');
  if (!docs.photo) missing.push('photo');
  if (academicLevel && academicLevel !== 'none' && !docs.qualification) missing.push('qualification');
  return missing;
}
