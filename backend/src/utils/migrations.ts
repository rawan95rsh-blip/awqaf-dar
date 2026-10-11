import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { Session } from '../models/Session';
import { Student } from '../models/Student';
import { RegistrationRequest } from '../models/RegistrationRequest';
import { ensureDefaultLevelsForCenter } from './centerLevels';
import { levelFullName, levelShortName } from '../constants/tracks';

/**
 * ترحيل بيانات آمن ومتكرر (idempotent) يعمل عند تشغيل الخادم:
 * 1) المستويات: إضافة الحقل track وتحويل «التمهيدي» القديم (order 0) إلى «تمهيدي أول»
 * 2) إنشاء سلّم التمهيدي ١–٦ والمطور ١–٨ لكل مركز نشط
 * 3) الطالبات في التمهيدي يصبح مسارهن «تمهيدي»
 */
export async function runStartupMigrations(): Promise<void> {
  // يجب إسقاط الفهرس القديم {centerId, order} قبل التحويل
  try {
    await Level.syncIndexes();
  } catch (err) {
    console.warn('[migrations] Level.syncIndexes:', (err as Error).message);
  }

  await Level.updateMany(
    { track: { $exists: false }, order: { $gte: 1 } },
    { $set: { track: 'mutor' } }
  );

  const legacyPreparatory = await Level.find({
    $or: [{ order: 0 }, { track: { $exists: false }, order: 0 }],
  });
  for (const level of legacyPreparatory) {
    const alreadyHasFirst = await Level.exists({
      centerId: level.centerId,
      track: 'preparatory',
      order: 1,
    });
    if (alreadyHasFirst) {
      // نقل الطالبات إلى «تمهيدي أول» ثم حذف المستوى القديم
      await Student.updateMany({ levelId: level._id }, { $set: { levelId: alreadyHasFirst._id } });
      await Level.deleteOne({ _id: level._id });
      continue;
    }
    level.track = 'preparatory';
    level.order = 1;
    level.shortName = levelShortName('preparatory', 1);
    level.fullName = levelFullName('preparatory', 1);
    await level.save();
  }

  const centers = await Center.find({ status: 'active' }).select('_id').lean();
  for (const center of centers) {
    await ensureDefaultLevelsForCenter(center._id);
  }

  const preparatoryLevelIds = await Level.find({ track: 'preparatory' }).distinct('_id');
  if (preparatoryLevelIds.length) {
    await Student.updateMany(
      { levelId: { $in: preparatoryLevelIds }, track: 'mutor' },
      { $set: { track: 'preparatory' } }
    );
    await RegistrationRequest.updateMany(
      { requestedLevelId: { $in: preparatoryLevelIds }, track: 'mutor' },
      { $set: { track: 'preparatory' } }
    );
  }

  for (const model of [Student, Session] as mongoose.Model<any>[]) {
    try {
      await model.syncIndexes();
    } catch (err) {
      console.warn(`[migrations] ${model.modelName}.syncIndexes:`, (err as Error).message);
    }
  }
}
