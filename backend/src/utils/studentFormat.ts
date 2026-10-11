import mongoose from 'mongoose';
import type { StudentStats } from './studentStats';
import { formatPhoneForDisplay } from './phone';

export type CenterSummary = {
  id: string;
  nameAr: string;
};

export type PopulatedLevel = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  shortName?: string | null;
  order?: number;
  track?: string | null;
};

export type PopulatedCourse = {
  _id: mongoose.Types.ObjectId;
  name: string;
};

type Address = {
  area?: string | null;
  block?: string | null;
  street?: string | null;
  avenue?: string | null;
  house?: string | null;
} | null;

type Documents = {
  civilId?: mongoose.Types.ObjectId | null;
  photo?: mongoose.Types.ObjectId | null;
  qualification?: mongoose.Types.ObjectId | null;
} | null;

type EnrollmentEvent = {
  action: string;
  reason?: string | null;
  meta?: unknown;
  at?: Date | null;
};

export type StudentWithLevel = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  idNumber: string;
  gender?: string | null;
  nationality: string;
  academicLevel: string;
  track?: string | null;
  trackNote?: string | null;
  enrollmentStatus?: string | null;
  phone: string;
  dob: Date;
  levelId?: PopulatedLevel | mongoose.Types.ObjectId | null;
  centerId: mongoose.Types.ObjectId;
  occupation?: string | null;
  occupationOther?: string | null;
  studentType?: string | null;
  homeAddress?: Address;
  notes?: string | null;
  courseIds?: Array<PopulatedCourse | mongoose.Types.ObjectId> | null;
  documents?: Documents;
  enrollmentHistory?: EnrollmentEvent[] | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function isPopulatedLevel(
  levelId: PopulatedLevel | mongoose.Types.ObjectId | null | undefined
): levelId is PopulatedLevel {
  return typeof levelId === 'object' && levelId !== null && 'fullName' in levelId;
}

function getLevelFields(levelId: PopulatedLevel | mongoose.Types.ObjectId | null | undefined) {
  if (isPopulatedLevel(levelId)) {
    return {
      levelId: levelId._id.toString(),
      levelName: levelId.fullName,
      levelShortName: levelId.shortName ?? levelId.fullName,
      level: {
        id: levelId._id.toString(),
        fullName: levelId.fullName,
        shortName: levelId.shortName ?? levelId.fullName,
        order: levelId.order ?? 0,
        track: levelId.track ?? 'mutor',
      },
    };
  }

  return {
    levelId: levelId ? levelId.toString() : null,
    levelName: '',
    levelShortName: '',
    level: null,
  };
}

function formatCourses(courseIds: StudentWithLevel['courseIds']) {
  return (courseIds ?? []).map((course) =>
    course && typeof course === 'object' && 'name' in course
      ? { id: course._id.toString(), name: course.name }
      : { id: String(course), name: '' }
  );
}

function formatDocuments(documents: Documents) {
  const toEntry = (id: mongoose.Types.ObjectId | null | undefined) =>
    id ? { id: id.toString(), url: `/api/files/${id.toString()}` } : null;
  return {
    civilId: toEntry(documents?.civilId),
    photo: toEntry(documents?.photo),
    qualification: toEntry(documents?.qualification),
  };
}

export const STUDENT_POPULATE = [
  { path: 'levelId', select: 'fullName shortName order track' },
  { path: 'courseIds', select: 'name' },
];

export function formatStudentListItem(student: StudentWithLevel, stats?: StudentStats) {
  const levelFields = getLevelFields(student.levelId);

  return {
    id: student._id.toString(),
    fullName: student.fullName,
    idNumber: student.idNumber,
    gender: student.gender ?? 'female',
    phone: student.phone,
    phoneDisplay: formatPhoneForDisplay(student.phone),
    dob: student.dob.toISOString().slice(0, 10),
    nationality: student.nationality,
    academicLevel: student.academicLevel,
    track: student.track ?? 'mutor',
    studentType: student.studentType ?? 'new',
    enrollmentStatus: student.enrollmentStatus ?? 'enrolled',
    levelId: levelFields.levelId,
    levelName: levelFields.levelName,
    levelShortName: levelFields.levelShortName,
    levelTrack: levelFields.level?.track ?? null,
    levelOrder: levelFields.level?.order ?? null,
    hasPhoto: Boolean(student.documents?.photo),
    photoUrl: student.documents?.photo ? `/api/files/${student.documents.photo.toString()}` : null,
    attendancePercent: stats?.attendancePercent ?? null,
    gradeAverage: stats?.gradeAverage ?? null,
    status: stats?.status ?? ('regular' as const),
  };
}

export function formatStudentProfile(
  student: StudentWithLevel,
  stats?: StudentStats,
  center?: CenterSummary | null
) {
  const levelFields = getLevelFields(student.levelId);
  const address = student.homeAddress ?? null;

  return {
    ...formatStudentListItem(student, stats),
    trackNote: student.trackNote ?? '',
    occupation: student.occupation ?? null,
    occupationOther: student.occupationOther ?? '',
    homeAddress: {
      area: address?.area ?? '',
      block: address?.block ?? '',
      street: address?.street ?? '',
      avenue: address?.avenue ?? '',
      house: address?.house ?? '',
    },
    notes: student.notes ?? '',
    courses: formatCourses(student.courseIds),
    documents: formatDocuments(student.documents ?? null),
    enrollmentHistory: (student.enrollmentHistory ?? [])
      .map((event) => ({
        action: event.action,
        reason: event.reason ?? '',
        meta: event.meta ?? {},
        at: event.at ? event.at.toISOString() : null,
      }))
      .reverse(),
    centerId: student.centerId.toString(),
    centerName: center?.nameAr ?? '',
    center: center ?? null,
    level: levelFields.level,
    absentDays: stats?.absentDays ?? 0,
    grades: [],
    attendanceCalendar: stats?.attendanceCalendar ?? [],
    createdAt: student.createdAt?.toISOString(),
    updatedAt: student.updatedAt?.toISOString(),
  };
}
