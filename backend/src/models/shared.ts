import { Schema } from 'mongoose';
import { OCCUPATIONS, STUDENT_TYPES } from '../constants/registration';
import { ENROLLMENT_ACTIONS } from '../constants/enrollment';

/** عنوان السكن */
export const homeAddressSchema = new Schema(
  {
    area: { type: String, trim: true, maxlength: 80, default: '' },
    block: { type: String, trim: true, maxlength: 20, default: '' },
    street: { type: String, trim: true, maxlength: 80, default: '' },
    avenue: { type: String, trim: true, maxlength: 40, default: '' },
    house: { type: String, trim: true, maxlength: 40, default: '' },
  },
  { _id: false }
);

/** المرفقات المخزنة في GridFS */
export const studentDocumentsSchema = new Schema(
  {
    civilId: { type: Schema.Types.ObjectId, default: null },
    photo: { type: Schema.Types.ObjectId, default: null },
    qualification: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false }
);

export const DOCUMENT_KINDS = ['civilId', 'photo', 'qualification'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABELS_AR: Record<DocumentKind, string> = {
  civilId: 'صورة البطاقة المدنية',
  photo: 'الصورة الشخصية',
  qualification: 'صورة آخر مؤهل دراسي',
};

/** الحقول الإضافية المشتركة بين طلب التسجيل وملف الطالبة */
export const studentProfileFields = {
  occupation: { type: String, enum: OCCUPATIONS, default: null },
  occupationOther: { type: String, trim: true, maxlength: 80, default: '' },
  studentType: { type: String, enum: STUDENT_TYPES, default: 'new' },
  homeAddress: { type: homeAddressSchema, default: () => ({}) },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  /** نص يوضح المسار عند اختيار «أخرى» */
  trackNote: { type: String, trim: true, maxlength: 200, default: '' },
  /** الدورات العلمية المختارة — لا تمنع التسجيل في مسار المطور */
  courseIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Course' }], default: [] },
  documents: { type: studentDocumentsSchema, default: () => ({}) },
} as const;

export const enrollmentEventSchema = new Schema(
  {
    action: { type: String, enum: ENROLLMENT_ACTIONS, required: true },
    reason: { type: String, trim: true, maxlength: 500, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);
