import type {
  DocumentKind,
  EnrollmentStatus,
  Gender,
  LevelTrack,
  Occupation,
  StudentStatus,
  StudentTrack,
  StudentType,
} from "@/src/constants/domain";

export type { StudentStatus };

export type AttendanceCalendarDay = {
  date: string;
  status: "present" | "absent" | "late" | null;
};

export interface HomeAddress {
  area: string;
  block?: string;
  street?: string;
  avenue?: string;
  house?: string;
}

export type DocumentEntry = { id: string; url: string } | null;

export interface StudentListItem {
  id: string;
  fullName: string;
  idNumber: string;
  gender?: Gender;
  phone: string;
  phoneDisplay?: string;
  dob: string;
  nationality: string;
  academicLevel: string;
  track: StudentTrack;
  studentType?: StudentType;
  enrollmentStatus: EnrollmentStatus;
  levelId: string | null;
  levelName: string;
  levelShortName: string;
  levelTrack?: LevelTrack | null;
  levelOrder?: number | null;
  photoUrl?: string | null;
  attendancePercent: number | null;
  gradeAverage: number | null;
  status: StudentStatus;
}

export interface StudentLevelInfo {
  id: string;
  fullName: string;
  shortName: string;
  order: number;
  track: LevelTrack;
}

export interface StudentCenterInfo {
  id: string;
  nameAr: string;
}

export interface EnrollmentEvent {
  action: string;
  reason: string;
  meta: Record<string, unknown>;
  at: string | null;
}

export interface StudentProfile extends StudentListItem {
  trackNote?: string;
  occupation: Occupation | null;
  occupationOther?: string;
  homeAddress: HomeAddress;
  notes: string;
  courses: Array<{ id: string; name: string }>;
  documents: Record<DocumentKind, DocumentEntry>;
  enrollmentHistory: EnrollmentEvent[];
  centerId?: string;
  centerName?: string;
  center: StudentCenterInfo | null;
  level: StudentLevelInfo | null;
  absentDays?: number;
  attendanceCalendar: AttendanceCalendarDay[];
  createdAt?: string;
  updatedAt?: string;
}

export function formatAddress(address?: Partial<HomeAddress> | null): string {
  if (!address) return "";
  const parts = [
    address.area,
    address.block ? `قطعة ${address.block}` : "",
    address.street ? `شارع ${address.street}` : "",
    address.avenue ? `جادة ${address.avenue}` : "",
    address.house ? `منزل ${address.house}` : "",
  ].filter((p) => p && p.trim());
  return parts.join("، ");
}
