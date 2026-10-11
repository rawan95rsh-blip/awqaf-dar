/**
 * بيانات تجريبية للتطوير المحلي فقط.
 * - يرفض العمل إذا كان NODE_ENV=production (إلا مع --force)
 * - كل الأسماء واضحة أنها تجريبية حتى لا تختلط بطالبات حقيقيات
 * - لحذف البيانات التجريبية من أي قاعدة: npm run purge-demo
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Attendance, type AttendanceStatus } from '../models/Attendance';
import { Grade } from '../models/Grade';
import { ClassOffer } from '../models/ClassOffer';
import { Course } from '../models/Course';
import { calculateGradeTotal, getGradeLabel } from '../constants/grades';
import { ensureDefaultLevelsForCenter } from '../utils/centerLevels';
import { runStartupMigrations } from '../utils/migrations';
import { centerDateKey } from '../utils/timezone';
import { DEMO_CENTER_NAME, DEMO_ID_PREFIX, DEMO_PHONE_PREFIX } from './demoData';

dotenv.config();

const ADMIN_PHONE = `${DEMO_PHONE_PREFIX}001`; // 96550000001
const STUDENT_PHONE = `${DEMO_PHONE_PREFIX}002`;
const PASSWORD = '123456';
const STUDENT_COUNT = 10;

async function upsertDemoCenter() {
  let center = await Center.findOne({ nameAr: DEMO_CENTER_NAME });
  if (!center) {
    center = await Center.create({
      nameAr: DEMO_CENTER_NAME,
      supervisorName: 'مشرفة تجريبية',
      specializations: ['mutor', 'courses'],
      addressText: 'عنوان تجريبي',
      city: 'الكويت',
      genderAudience: 'female',
      status: 'active',
    });
  }
  await ensureDefaultLevelsForCenter(center._id);
  return center;
}

function demoIdNumber(index: number): string {
  return `${DEMO_ID_PREFIX}${String(index).padStart(4, '0')}`;
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed demo data in production. Use --force if you really mean it.');
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  await connectDB(mongoUri);
  await runStartupMigrations();

  const center = await upsertDemoCenter();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  let admin = await User.findOne({ phone: ADMIN_PHONE });
  if (!admin) {
    admin = await User.create({
      phone: ADMIN_PHONE,
      passwordHash,
      role: 'center_admin',
      centerId: center._id,
      isActive: true,
    });
  }

  const mutor1 = await Level.findOne({ centerId: center._id, track: 'mutor', order: 1 });
  const prep1 = await Level.findOne({ centerId: center._id, track: 'preparatory', order: 1 });
  if (!mutor1 || !prep1) throw new Error('Levels missing');

  const course =
    (await Course.findOne({ centerId: center._id, name: 'دورة تجريبية' })) ??
    (await Course.create({ centerId: center._id, name: 'دورة تجريبية', createdBy: admin._id }));

  for (let i = 1; i <= STUDENT_COUNT; i += 1) {
    const idNumber = demoIdNumber(i);
    const level = i % 3 === 0 ? prep1 : mutor1;
    const phone = i === 1 ? STUDENT_PHONE : `${DEMO_PHONE_PREFIX}${String(100 + i)}`;
    const student =
      (await Student.findOne({ idNumber, deletedAt: null })) ??
      (await Student.create({
        fullName: `طالبة تجريبية ${i}`,
        idNumber,
        gender: 'female',
        nationality: 'KW',
        academicLevel: 'high',
        track: level.track,
        phone,
        dob: new Date(Date.UTC(1995, i % 12, 1 + i)),
        levelId: level._id,
        centerId: center._id,
        occupation: i % 2 ? 'housewife' : 'employee',
        studentType: i % 4 ? 'continuing' : 'new',
        homeAddress: { area: 'منطقة تجريبية', block: String(i) },
        courseIds: i % 2 ? [course._id] : [],
        enrollmentHistory: [{ action: 'registered', at: new Date() }],
      }));
    if (!(await User.exists({ studentId: student._id }))) {
      await User.create({
        phone,
        passwordHash,
        role: 'student',
        centerId: center._id,
        studentId: student._id,
        isActive: true,
      });
    }
  }

  if (!(await ClassOffer.exists({ centerId: center._id }))) {
    const weights = { attendance: 20, shortExam: 20, participation: 20, final: 40 };
    await ClassOffer.insertMany([
      { centerId: center._id, track: 'mutor', levelId: mutor1._id, subjectName: 'التجويد', subjectIndex: 3, mode: 'in_person', weekday: 0, startTime: '09:00', endTime: '10:00', teacherName: 'معلمة تجريبية', gradeWeights: weights, createdBy: admin._id },
      { centerId: center._id, track: 'mutor', levelId: mutor1._id, subjectName: 'التفسير', subjectIndex: 5, mode: 'online', weekday: 2, startTime: '18:00', endTime: '19:00', teacherName: 'معلمة تجريبية', gradeWeights: weights, createdBy: admin._id },
      { centerId: center._id, track: 'preparatory', levelId: prep1._id, subjectName: 'القرآن', subjectIndex: 4, mode: 'in_person', weekday: 1, startTime: '10:00', endTime: '11:30', teacherName: 'معلمة تجريبية', gradeWeights: weights, createdBy: admin._id },
      { centerId: center._id, track: 'courses', levelId: null, courseId: course._id, subjectName: 'السيرة', subjectIndex: 0, mode: 'in_person', weekday: 3, startTime: '17:00', endTime: '18:00', teacherName: 'معلمة تجريبية', gradeWeights: weights, createdBy: admin._id },
    ]);
  }

  // حضور ودرجات للأسبوع الماضي
  const students = await Student.find({ centerId: center._id, idNumber: { $regex: `^${DEMO_ID_PREFIX}` } });
  const statuses: AttendanceStatus[] = ['present', 'present', 'late', 'present', 'absent'];
  for (const [index, student] of students.entries()) {
    if (!student.levelId) continue;
    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
      const key = centerDateKey(new Date(Date.now() - dayOffset * 86400000));
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      await Attendance.updateOne(
        { studentId: student._id, levelId: student.levelId, subjectIndex: 3, date },
        { $setOnInsert: { centerId: center._id, status: statuses[(index + dayOffset) % statuses.length] } },
        { upsert: true }
      );
    }
    for (const subjectIndex of [0, 1, 2, 3, 4, 5, 6]) {
      const breakdown = {
        attendance: 15 + ((index + subjectIndex) % 6),
        shortExam: 14 + ((index * 2 + subjectIndex) % 7),
        participation: 15 + ((index + subjectIndex * 2) % 6),
        final: 28 + ((index * 3 + subjectIndex) % 13),
      };
      const total = calculateGradeTotal(breakdown);
      await Grade.updateOne(
        { studentId: student._id, levelId: student.levelId, subjectIndex },
        { $set: { centerId: center._id, breakdown, total, label: getGradeLabel(total) } },
        { upsert: true }
      );
    }
  }

  console.log('\nDemo data ready (local development only).');
  console.log(`  Center admin: +${ADMIN_PHONE} / ${PASSWORD}`);
  console.log(`  Student:      civil ID ${demoIdNumber(1)} or +${STUDENT_PHONE} / ${PASSWORD}`);
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
