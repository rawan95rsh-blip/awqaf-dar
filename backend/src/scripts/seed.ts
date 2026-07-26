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
import { Session } from '../models/Session';
import { ClassOffer } from '../models/ClassOffer';
import { Course } from '../models/Course';
import { nextOccurrence } from '../constants/classOffers';
import { calculateGradeTotal, getGradeLabel } from '../constants/grades';
import { ensureAllDefaultLevelsForCenter } from '../utils/centerLevels';

dotenv.config();

const SEED_PHONE = '0512345678';
const SEED_PASSWORD = '123456';

/** حساب طالبة ثابت للتجربة — يُعاد ضبطه مع كل seed */
const SEED_STUDENT_ID_NUMBER = '123456789012';
const SEED_STUDENT_PHONE = '0598765497';
const SEED_STUDENT_PASSWORD = '123456';

const SEED_CENTERS = [
  {
    nameAr: 'مركز تجريبي',
    supervisorName: 'مشرف المركز',
    specializations: ['mutor'],
    addressText: 'شارع الملك فهد، حي النسيم، بجوار مسجد الفرقان',
    city: 'الرياض',
    genderAudience: 'female' as const,
  },
  {
    nameAr: 'مركز النور',
    supervisorName: 'أ. سارة المطيري',
    specializations: ['mutor', 'dawa'],
    addressText: 'طريق الملك عبدالله، حي الياسمين',
    city: 'الرياض',
    genderAudience: 'female' as const,
  },
  {
    nameAr: 'مركز الفرقان',
    supervisorName: 'أ. نورة العتيبي',
    specializations: ['mutor', 'courses'],
    addressText: 'شارع التحلية، حي الروضة',
    city: 'جدة',
    genderAudience: 'male' as const,
  },
] as const;

const SEED_STUDENTS = [
  {
    fullName: 'نورة العتيبي',
    idNumber: '001000000001',
    phone: '0591000001',
    dob: '2010-05-15',
    nationality: 'KW',
    academicLevel: 'high',
    levelOrder: 1,
  },
  {
    fullName: 'سارة المطيري',
    idNumber: '001000000002',
    phone: '0591000002',
    dob: '2011-03-20',
    nationality: 'KW',
    academicLevel: 'middle',
    levelOrder: 2,
  },
  {
    fullName: 'فاطمة الشمري',
    idNumber: '001000000003',
    phone: '0591000003',
    dob: '2009-11-08',
    nationality: 'SA',
    academicLevel: 'high',
    levelOrder: 3,
  },
  {
    fullName: 'مريم العنزي',
    idNumber: '001000000004',
    phone: '0591000004',
    dob: '2012-01-30',
    nationality: 'KW',
    academicLevel: 'middle',
    levelOrder: 4,
  },
  {
    fullName: 'هند الرشيدي',
    idNumber: '001000000005',
    phone: '0591000005',
    dob: '2010-08-12',
    nationality: 'AE',
    academicLevel: 'high',
    levelOrder: 5,
  },
  {
    fullName: 'لمى الدوسري',
    idNumber: '001000000006',
    phone: '0591000006',
    dob: '2011-06-25',
    nationality: 'KW',
    academicLevel: 'university',
    levelOrder: 6,
  },
  {
    fullName: 'ريم القحطاني',
    idNumber: '001000000007',
    phone: '0591000007',
    dob: '2008-12-03',
    nationality: 'KW',
    academicLevel: 'high',
    levelOrder: 7,
  },
  {
    fullName: 'عائشة الحربي',
    idNumber: '001000000008',
    phone: '0591000008',
    dob: '2013-04-18',
    nationality: 'KW',
    academicLevel: 'none',
    levelOrder: 8,
  },
  {
    fullName: 'خديجة الزهراني',
    idNumber: '001000000009',
    phone: '0591000009',
    dob: '2010-02-10',
    nationality: 'KW',
    academicLevel: 'high',
    levelOrder: 9,
  },
  {
    fullName: 'دانة الغامدي',
    idNumber: '001000000010',
    phone: '0591000010',
    dob: '2011-09-22',
    nationality: 'SA',
    academicLevel: 'middle',
    levelOrder: 10,
  },
] as const;

async function seedStudents(centerId: mongoose.Types.ObjectId, centerName: string): Promise<void> {
  const levels = await Level.find({ centerId }).sort({ order: 1 });
  if (levels.length === 0) {
    console.log(`\n${centerName} — no levels, skipping students`);
    return;
  }

  let created = 0;
  let updated = 0;

  for (const studentData of SEED_STUDENTS) {
    const level =
      levels.find((item) => item.order === studentData.levelOrder) ?? levels[0];
    if (!level) {
      continue;
    }

    const existing = await Student.findOne({ idNumber: studentData.idNumber });
    if (existing) {
      existing.fullName = studentData.fullName;
      existing.phone = studentData.phone;
      existing.dob = new Date(studentData.dob);
      existing.nationality = studentData.nationality;
      existing.academicLevel = studentData.academicLevel;
      existing.levelId = level._id;
      existing.centerId = centerId;
      existing.gender = 'female';
      existing.track = existing.track ?? 'mutor';
      await existing.save();
      updated += 1;
      continue;
    }

    await Student.create({
      fullName: studentData.fullName,
      idNumber: studentData.idNumber,
      gender: 'female',
      phone: studentData.phone,
      dob: new Date(studentData.dob),
      nationality: studentData.nationality,
      academicLevel: studentData.academicLevel,
      track: 'mutor',
      levelId: level._id,
      centerId,
    });
    created += 1;
  }

  const sampleStudent = await Student.findOne({ centerId }).sort({ createdAt: 1 });
  console.log(`\n${centerName} — students: ${created} created, ${updated} updated`);
  if (sampleStudent) {
    console.log(`  sample studentId: ${sampleStudent._id.toString()}`);
  }
}

async function seedOtherCenterSampleStudent(
  centerId: mongoose.Types.ObjectId,
  centerName: string
): Promise<string | undefined> {
  const levels = await Level.find({ centerId }).sort({ order: 1 });
  const level = levels[0];
  if (!level) {
    return undefined;
  }

  const idNumber = '100000000099';
  const existing = await Student.findOne({ idNumber });
  const payload = {
    fullName: 'أمل السالم',
    idNumber,
    gender: 'female' as const,
    phone: '0591000099',
    dob: new Date('2011-02-14'),
    nationality: 'KW' as const,
    academicLevel: 'middle' as const,
    track: 'mutor' as const,
    levelId: level._id,
    centerId,
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    console.log(`\n${centerName} — other-center sample student ready`);
    console.log(`  otherCenterStudentId: ${existing._id.toString()}`);
    return existing._id.toString();
  }

  const student = await Student.create(payload);
  console.log(`\n${centerName} — other-center sample student created`);
  console.log(`  otherCenterStudentId: ${student._id.toString()}`);
  return student._id.toString();
}

async function seedTestStudentUser(
  centerId: mongoose.Types.ObjectId,
  centerName: string
): Promise<void> {
  const levels = await Level.find({ centerId }).sort({ order: 1 });
  const level = levels[0];
  if (!level) {
    console.log(`\n${centerName} — no levels, skipping test student user`);
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_STUDENT_PASSWORD, 10);

  let student = await Student.findOne({ idNumber: SEED_STUDENT_ID_NUMBER });
  if (student) {
    student.fullName = 'نورة العتيبي';
    student.phone = SEED_STUDENT_PHONE;
    student.dob = new Date('2010-05-15');
    student.nationality = 'KW';
    student.academicLevel = 'high';
    student.levelId = level._id;
    student.centerId = centerId;
    student.gender = 'female';
    student.track = 'mutor';
    await student.save();
  } else {
    student = await Student.create({
      fullName: 'نورة العتيبي',
      idNumber: SEED_STUDENT_ID_NUMBER,
      gender: 'female',
      phone: SEED_STUDENT_PHONE,
      dob: new Date('2010-05-15'),
      nationality: 'KW',
      academicLevel: 'high',
      track: 'mutor',
      levelId: level._id,
      centerId,
    });
  }

  let user = await User.findOne({ studentId: student._id, role: 'student' });
  if (!user) {
    user = await User.findOne({ phone: SEED_STUDENT_PHONE });
  }

  if (user) {
    user.passwordHash = passwordHash;
    user.role = 'student';
    user.centerId = centerId;
    user.studentId = student._id;
    user.isActive = true;
    await user.save();
  } else {
    await User.create({
      phone: SEED_STUDENT_PHONE,
      passwordHash,
      role: 'student',
      centerId,
      studentId: student._id,
      isActive: true,
    });
  }

  console.log(`\n${centerName} — test student login ready`);
  console.log(`  idNumber: ${SEED_STUDENT_ID_NUMBER}`);
  console.log(`  phone: ${SEED_STUDENT_PHONE}`);
  console.log(`  password: ${SEED_STUDENT_PASSWORD}`);
  console.log(`  studentId: ${student._id.toString()}`);
}

const SEED_SUBJECT_INDICES = [0, 1] as const;
const SEED_ATTENDANCE_DAYS = 7;
const ATTENDANCE_STATUSES_CYCLE: AttendanceStatus[] = [
  'present',
  'present',
  'late',
  'present',
  'absent',
  'present',
  'present',
];

function getRecentUtcDates(count: number): Date[] {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dates: Date[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    dates.push(date);
  }

  return dates;
}

function buildSeedGradeBreakdown(seed: number) {
  const breakdown = {
    attendance: 18 + (seed % 3),
    shortExam: 17 + (seed % 4),
    participation: 16 + (seed % 5),
    final: 35 + (seed % 6),
  };
  const total = calculateGradeTotal(breakdown);
  return {
    breakdown,
    total,
    label: getGradeLabel(total),
  };
}

async function seedAttendanceAndGrades(
  centerId: mongoose.Types.ObjectId,
  centerName: string
): Promise<void> {
  const students = await Student.find({ centerId }).sort({ fullName: 1 });
  if (students.length === 0) {
    console.log(`\n${centerName} — no students, skipping attendance/grades`);
    return;
  }

  const dates = getRecentUtcDates(SEED_ATTENDANCE_DAYS);
  let attendanceCount = 0;
  let gradesCount = 0;

  for (const [studentIndex, student] of students.entries()) {
    for (const subjectIndex of SEED_SUBJECT_INDICES) {
      for (const [dayIndex, date] of dates.entries()) {
        const status =
          ATTENDANCE_STATUSES_CYCLE[dayIndex % ATTENDANCE_STATUSES_CYCLE.length];

        await Attendance.findOneAndUpdate(
          {
            studentId: student._id,
            levelId: student.levelId,
            subjectIndex,
            date,
          },
          {
            studentId: student._id,
            levelId: student.levelId,
            centerId,
            subjectIndex,
            date,
            status,
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
        attendanceCount += 1;
      }

      const gradeSeed = studentIndex + subjectIndex * 3;
      const { breakdown, total, label } = buildSeedGradeBreakdown(gradeSeed);

      await Grade.findOneAndUpdate(
        {
          studentId: student._id,
          levelId: student.levelId,
          subjectIndex,
        },
        {
          studentId: student._id,
          levelId: student.levelId,
          centerId,
          subjectIndex,
          breakdown,
          total,
          label,
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      gradesCount += 1;
    }
  }

  console.log(
    `\n${centerName} — sample data: ${attendanceCount} attendance, ${gradesCount} grades`
  );
  console.log(`  subjects: ${SEED_SUBJECT_INDICES.join(', ')}`);
  console.log(`  days: ${SEED_ATTENDANCE_DAYS}`);
  for (const student of students.slice(0, 5)) {
    console.log(`  studentId (${student.fullName}): ${student._id.toString()}`);
  }
}

async function seedLevels(centerId: mongoose.Types.ObjectId, centerName: string): Promise<void> {
  await ensureAllDefaultLevelsForCenter(centerId);

  const levels = await Level.find({ centerId }).sort({ order: 1 });
  console.log(`\n${centerName} — ${levels.length} levels`);
  if (levels[0]) {
    console.log(`  centerId: ${centerId.toString()}`);
    console.log(`  first levelId: ${levels[0]._id.toString()}`);
  }
}

/** حصص مطور تجريبية + دورات علمية باسمها */
async function seedSampleSessions(
  centerId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  centerName: string
): Promise<void> {
  const level = await Level.findOne({ centerId, order: 1 });
  if (!level) {
    console.log(`\n${centerName} — no levels, skipping sessions`);
    return;
  }

  await Session.deleteMany({ centerId });
  await ClassOffer.deleteMany({ centerId });
  await Course.deleteMany({ centerId });

  await Course.create({
    centerId,
    name: 'أعمال القلوب',
    description: 'دورة علمية تجريبية',
    createdBy,
  });
  await Course.create({
    centerId,
    name: 'مواريث',
    createdBy,
  });

  const mutorOffer = await ClassOffer.create({
    centerId,
    track: 'mutor',
    levelId: level._id,
    subjectName: 'السيرة',
    subjectIndex: 0,
    mode: 'in_person',
    weekday: 0,
    startTime: '10:00',
    endTime: '11:00',
    teacherName: 'مشرف المركز',
    gradeWeights: { attendance: 20, shortExam: 20, participation: 20, final: 40 },
    createdBy,
  });

  const mutorTimes = nextOccurrence(0, { hours: 10, minutes: 0 }, { hours: 11, minutes: 0 });
  const onlineTimes = nextOccurrence(2, { hours: 19, minutes: 0 }, { hours: 20, minutes: 0 });
  const checkInStart = new Date();
  checkInStart.setMinutes(checkInStart.getMinutes() - 10);
  const checkInEnd = new Date();
  checkInEnd.setMinutes(checkInEnd.getMinutes() + 50);

  const levelTwo = await Level.findOne({ centerId, order: 2 });
  const otherLevelTimes = nextOccurrence(
    1,
    { hours: 12, minutes: 0 },
    { hours: 13, minutes: 0 }
  );

  await Session.insertMany([
    {
      centerId,
      levelId: level._id,
      classOfferId: mutorOffer._id,
      subjectIndex: 0,
      title: 'السيرة — مطور',
      startAt: mutorTimes.startAt,
      endAt: mutorTimes.endAt,
      mode: 'hybrid',
      zoomUrl: 'https://zoom.us/j/1234567890',
      teacherName: 'مشرف المركز',
      notes: 'حصة مطور تجريبية مع رابط Zoom',
      status: 'scheduled',
      createdBy,
    },
    {
      centerId,
      levelId: level._id,
      classOfferId: mutorOffer._id,
      subjectIndex: 0,
      title: 'السيرة — أونلاين Zoom',
      startAt: onlineTimes.startAt,
      endAt: onlineTimes.endAt,
      mode: 'online',
      zoomUrl: 'https://zoom.us/j/9876543210',
      teacherName: 'مشرف المركز',
      notes: 'حصة أونلاين لاختبار انضمام Zoom',
      status: 'scheduled',
      createdBy,
    },
    {
      centerId,
      levelId: level._id,
      classOfferId: mutorOffer._id,
      subjectIndex: 0,
      title: 'حصة تجريبية — حضور الآن',
      startAt: checkInStart,
      endAt: checkInEnd,
      mode: 'hybrid',
      zoomUrl: 'https://zoom.us/j/1111222233',
      teacherName: 'مشرف المركز',
      notes: 'لاختبار تسجيل حضور الطالبة (نافذة مفتوحة الآن)',
      status: 'scheduled',
      createdBy,
    },
    ...(levelTwo
      ? [
          {
            centerId,
            levelId: levelTwo._id,
            classOfferId: null,
            subjectIndex: 1,
            title: 'التجويد — مطور ٢',
            startAt: otherLevelTimes.startAt,
            endAt: otherLevelTimes.endAt,
            mode: 'in_person' as const,
            teacherName: 'مشرف المركز',
            notes: 'حصة مستوى آخر لتمييز جدول الطالبة',
            status: 'scheduled' as const,
            createdBy,
          },
        ]
      : []),
  ]);

  const count = await Session.countDocuments({ centerId });
  const offers = await ClassOffer.countDocuments({ centerId });
  const courses = await Course.countDocuments({ centerId });
  console.log(
    `\n${centerName} — courses: ${courses}, class offers: ${offers}, sessions: ${count}`
  );
  console.log(`  first levelId: ${level._id.toString()}`);
}

async function ensureCenter(data: (typeof SEED_CENTERS)[number]) {
  let center = await Center.findOne({ nameAr: data.nameAr });
  if (!center) {
    center = await Center.create({
      nameAr: data.nameAr,
      supervisorName: data.supervisorName,
      specializations: [...data.specializations],
      addressText: data.addressText,
      city: data.city,
      genderAudience: data.genderAudience,
      status: 'active',
    });
    console.log('Created center:', center.nameAr);
    return center;
  }

  center.supervisorName = data.supervisorName;
  center.specializations = [...data.specializations];
  center.addressText = data.addressText;
  center.city = data.city;
  center.genderAudience = data.genderAudience;
  center.status = 'active';
  await center.save();
  console.log('Center ready:', center.nameAr);
  return center;
}

async function seed(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  await connectDB(mongoUri);

  const centers = [];
  for (const centerData of SEED_CENTERS) {
    const center = await ensureCenter(centerData);
    centers.push(center);
    await seedLevels(center._id, center.nameAr);
    if (center.nameAr === 'مركز تجريبي') {
      await seedStudents(center._id, center.nameAr);
      await seedTestStudentUser(center._id, center.nameAr);
      await seedAttendanceAndGrades(center._id, center.nameAr);
    }
    if (center.nameAr === 'مركز النور') {
      await seedOtherCenterSampleStudent(center._id, center.nameAr);
    }
  }

  const activeCenters = await Center.find({ status: 'active' });
  for (const center of activeCenters) {
    if (center.genderAudience !== 'female' && center.genderAudience !== 'male') {
      center.genderAudience = 'female';
      await center.save();
    }
    // أزل مستويات قديمة خارج سلّم التمهيدي+المطور (order 0–8)
    const removed = await Level.deleteMany({
      centerId: center._id,
      order: { $gt: 8 },
    });
    if (removed.deletedCount) {
      console.log(
        `\n${center.nameAr} — removed ${removed.deletedCount} non-mutor level(s)`
      );
    }
  }

  const primaryCenter = centers[0];
  if (!primaryCenter) {
    throw new Error('No seed centers created');
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const existingUser = await User.findOne({ phone: SEED_PHONE });

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.role = 'center_admin';
    existingUser.centerId = primaryCenter._id;
    existingUser.isActive = true;
    await existingUser.save();
    console.log('\nUpdated admin user:', SEED_PHONE);
  } else {
    await User.create({
      phone: SEED_PHONE,
      passwordHash,
      role: 'center_admin',
      centerId: primaryCenter._id,
      isActive: true,
      email: 'center@awqaf-dar.dev',
    });
    console.log('\nCreated admin user:', SEED_PHONE);
  }

  const adminUser = await User.findOne({ phone: SEED_PHONE });
  if (adminUser) {
    await seedSampleSessions(primaryCenter._id, adminUser._id, primaryCenter.nameAr);
  }

  console.log('\nPublic centers:', activeCenters.length);
  console.log('Seed complete.');
  console.log('Admin login:', SEED_PHONE, '/', SEED_PASSWORD);
  console.log(
    'Student login:',
    SEED_STUDENT_ID_NUMBER,
    '/',
    SEED_STUDENT_PASSWORD
  );
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
