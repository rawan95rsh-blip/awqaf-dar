export type StudentStatus =
  | 'regular'
  | 'frequent_absence'
  | 'warning'
  | 'excellent';

export type AttendanceCalendarDay = {
  date: string;
  status: 'present' | 'absent' | 'late' | null;
};

export interface StudentListItem {
  id: string;
  fullName: string;
  idNumber: string;
  gender?: 'female' | 'male';
  phone: string;
  dob: string;
  nationality: string;
  academicLevel: string;
  track?: 'mutor' | 'courses';
  enrollmentStatus?: 'enrolled' | 'graduated' | 'suspended';
  levelId: string;
  levelName: string;
  levelShortName: string;
  attendancePercent: number | null;
  gradeAverage: number | null;
  status: StudentStatus;
}

export interface StudentLevelInfo {
  id: string;
  fullName: string;
  shortName: string;
  order: number;
}

export interface StudentCenterInfo {
  id: string;
  nameAr: string;
}

export interface StudentProfile extends StudentListItem {
  centerId?: string;
  centerName?: string;
  center: StudentCenterInfo | null;
  level: StudentLevelInfo | null;
  absentDays?: number;
  grades: unknown[];
  attendanceCalendar: AttendanceCalendarDay[];
  createdAt?: string;
  updatedAt?: string;
}
