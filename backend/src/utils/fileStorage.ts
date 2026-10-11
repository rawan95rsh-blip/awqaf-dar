import mongoose from 'mongoose';
import { Readable } from 'stream';
import type { Response } from 'express';

/**
 * تخزين المرفقات (صور البطاقة المدنية / الصورة الشخصية / المؤهل) داخل MongoDB GridFS.
 * يناسب الاستضافة المجانية (Render) لأن قرص الخادم مؤقت ويُمسح عند كل نشر.
 */
const BUCKET_NAME = 'uploads';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export type FileMeta = {
  centerId: string;
  kind: string;
  studentId?: string | null;
  registrationRequestId?: string | null;
};

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function saveFile(
  buffer: Buffer,
  contentType: string,
  filename: string,
  metadata: FileMeta
): Promise<mongoose.Types.ObjectId> {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, {
      metadata: { ...metadata, contentType },
    });
    Readable.from(buffer)
      .pipe(upload)
      .on('error', reject)
      .on('finish', () => resolve(upload.id as mongoose.Types.ObjectId));
  });
}

export async function findFile(id: mongoose.Types.ObjectId) {
  const files = await bucket().find({ _id: id }).limit(1).toArray();
  return files[0] ?? null;
}

export async function streamFile(id: mongoose.Types.ObjectId, res: Response): Promise<boolean> {
  const file = await findFile(id);
  if (!file) return false;
  const contentType =
    (file.metadata as { contentType?: string } | undefined)?.contentType ?? 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', String(file.length));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  await new Promise<void>((resolve, reject) => {
    bucket().openDownloadStream(id).on('error', reject).on('end', () => resolve()).pipe(res);
  });
  return true;
}

export async function updateFilesMetadata(
  ids: Array<mongoose.Types.ObjectId | null | undefined>,
  patch: Partial<FileMeta>
): Promise<void> {
  const validIds = ids.filter((id): id is mongoose.Types.ObjectId => !!id);
  if (!validIds.length) return;
  const db = mongoose.connection.db;
  if (!db) return;
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    set[`metadata.${key}`] = value;
  }
  await db.collection(`${BUCKET_NAME}.files`).updateMany({ _id: { $in: validIds } }, { $set: set });
}

export async function deleteFileSafe(id: mongoose.Types.ObjectId | null | undefined): Promise<void> {
  if (!id) return;
  try {
    await bucket().delete(id);
  } catch {
    // الملف غير موجود — لا مشكلة
  }
}
