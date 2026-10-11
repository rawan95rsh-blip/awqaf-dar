import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '../utils/fileStorage';
import { sendError } from '../utils/response';
import { DOCUMENT_KINDS } from '../models/shared';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: DOCUMENT_KINDS.length },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_FILE_TYPE'));
  },
});

const documentsFields = imageUpload.fields(DOCUMENT_KINDS.map((name) => ({ name, maxCount: 1 })));

/** يقبل multipart/form-data للمرفقات، ويمرر JSON كما هو */
export function documentsUpload(req: Request, res: Response, next: NextFunction): void {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }
  documentsFields(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        sendError(res, 'حجم الصورة كبير — الحد الأقصى 6 ميجابايت', 400);
        return;
      }
      sendError(res, 'تعذر رفع المرفقات', 400);
      return;
    }
    if (err instanceof Error && err.message === 'UNSUPPORTED_FILE_TYPE') {
      sendError(res, 'نوع الملف غير مدعوم — ارفعي صورة (JPG أو PNG)', 400);
      return;
    }
    sendError(res, 'تعذر رفع المرفقات', 400);
  });
}

export type UploadedDocuments = Partial<Record<(typeof DOCUMENT_KINDS)[number], Express.Multer.File[]>>;

export function getUploadedDocuments(req: Request): UploadedDocuments {
  const files = req.files;
  if (!files || Array.isArray(files)) return {};
  return files as UploadedDocuments;
}
