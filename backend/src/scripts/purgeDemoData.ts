/**
 * حذف الطالبات الوهميات (البيانات التجريبية) من قاعدة البيانات.
 *
 *   npm run purge-demo            ← معاينة فقط (لا يحذف شيئاً)
 *   npm run purge-demo -- --confirm  ← حذف فعلي
 *
 * يحذف: الطالبات بالأرقام المدنية التجريبية + حساباتهن + حضورهن ودرجاتهن وطلباتهن.
 * لا يحذف المراكز ولا حسابات المشرفات — يطبعها فقط لتراجعيها يدوياً.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { Grade } from '../models/Grade';
import { RegistrationRequest } from '../models/RegistrationRequest';
import { SuspensionRequest } from '../models/SuspensionRequest';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';
import { TransferRequest } from '../models/TransferRequest';
import { Center } from '../models/Center';
import {
  DEMO_CENTER_NAME,
  DEMO_ID_PREFIX,
  LEGACY_DEMO_CENTER_NAMES,
  LEGACY_DEMO_ID_NUMBERS,
} from './demoData';

dotenv.config();

async function purge(): Promise<void> {
  const confirm = process.argv.includes('--confirm');
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  await connectDB(mongoUri);

  const students = await Student.find({
    $or: [
      { idNumber: { $in: LEGACY_DEMO_ID_NUMBERS } },
      { idNumber: { $regex: `^${DEMO_ID_PREFIX}` } },
    ],
  })
    .select('fullName idNumber centerId')
    .lean();

  const studentIds = students.map((s) => s._id);
  console.log(`\nDemo students found: ${students.length}`);
  for (const s of students) console.log(`  - ${s.fullName} (${s.idNumber})`);

  const demoCenters = await Center.find({
    nameAr: { $in: [...LEGACY_DEMO_CENTER_NAMES, DEMO_CENTER_NAME] },
  })
    .select('nameAr')
    .lean();
  if (demoCenters.length) {
    console.log('\nCenters with demo names (NOT deleted — review manually):');
    for (const c of demoCenters) console.log(`  - ${c.nameAr} (${c._id.toString()})`);
  }

  if (!confirm) {
    console.log('\nDry run only. Re-run with --confirm to delete the students listed above.');
    return;
  }

  const filter = { studentId: { $in: studentIds } };
  const results = await Promise.all([
    Attendance.deleteMany(filter),
    Grade.deleteMany(filter),
    SuspensionRequest.deleteMany(filter),
    AccountDeletionRequest.deleteMany(filter),
    TransferRequest.deleteMany(filter),
    User.deleteMany({ role: 'student', studentId: { $in: studentIds } }),
    RegistrationRequest.deleteMany({
      $or: [
        { idNumber: { $in: LEGACY_DEMO_ID_NUMBERS } },
        { idNumber: { $regex: `^${DEMO_ID_PREFIX}` } },
      ],
    }),
    Student.deleteMany({ _id: { $in: studentIds } }),
  ]);
  const labels = ['attendance', 'grades', 'suspension', 'deletion', 'transfer', 'users', 'registration', 'students'];
  console.log('\nDeleted:');
  results.forEach((r, i) => console.log(`  ${labels[i]}: ${r.deletedCount}`));
}

purge()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Purge failed:', err);
    process.exit(1);
  });
