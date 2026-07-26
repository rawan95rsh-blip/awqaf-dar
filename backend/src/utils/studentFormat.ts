import mongoose from 'mongoose';
import type { StudentStats } from './studentStats';

export type CenterSummary = {
  id: string;
  nameAr: string;
};

export type PopulatedLevel = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  shortName?: string | null;
  order?: number;
};

export type StudentWithLevel = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  idNumber: string;
  gender?: string | null;
  nationality: string;
  academicLevel: string;
  track?: string | null;
  enrollmentStatus?: string | null;
  phone: string;
  dob: Date;
  levelId: PopulatedLevel | mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

function isPopulatedLevel(
  levelId: PopulatedLevel | mongoose.Types.ObjectId
): levelId is PopulatedLevel {
  return typeof levelId === 'object' && levelId !== null && 'fullName' in levelId;
}

function getLevelFields(levelId: PopulatedLevel | mongoose.Types.ObjectId) {
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
      },
    };
  }

  return {
    levelId: levelId.toString(),
    levelName: '',
    levelShortName: '',
    level: undefined,
  };
}

export function formatStudentListItem(
  student: StudentWithLevel,
  stats?: StudentStats
) {
  const levelFields = getLevelFields(student.levelId);

  return {
    id: student._id.toString(),
    fullName: student.fullName,
    idNumber: student.idNumber,
    gender: student.gender ?? 'female',
    phone: student.phone,
    dob: student.dob.toISOString().slice(0, 10),
    nationality: student.nationality,
    academicLevel: student.academicLevel,
    track: student.track ?? 'mutor',
    enrollmentStatus: student.enrollmentStatus ?? 'enrolled',
    levelId: levelFields.levelId,
    levelName: levelFields.levelName,
    levelShortName: levelFields.levelShortName,
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

  return {
    id: student._id.toString(),
    fullName: student.fullName,
    idNumber: student.idNumber,
    gender: student.gender ?? 'female',
    phone: student.phone,
    dob: student.dob.toISOString().slice(0, 10),
    nationality: student.nationality,
    academicLevel: student.academicLevel,
    track: student.track ?? 'mutor',
    enrollmentStatus: student.enrollmentStatus ?? 'enrolled',
    centerId: student.centerId.toString(),
    centerName: center?.nameAr ?? '',
    center: center ?? null,
    levelId: levelFields.levelId,
    levelName: levelFields.levelName,
    levelShortName: levelFields.levelShortName,
    level: levelFields.level ?? null,
    attendancePercent: stats?.attendancePercent ?? null,
    gradeAverage: stats?.gradeAverage ?? null,
    status: stats?.status ?? ('regular' as const),
    absentDays: stats?.absentDays ?? 0,
    grades: [],
    attendanceCalendar: stats?.attendanceCalendar ?? [],
    createdAt: student.createdAt?.toISOString(),
    updatedAt: student.updatedAt?.toISOString(),
  };
}
