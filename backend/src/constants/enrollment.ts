export const ENROLLMENT_STATUSES = ['enrolled', 'graduated', 'suspended'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_STATUS_LABELS_AR: Record<EnrollmentStatus, string> = {
  enrolled: 'مسجّلة',
  graduated: 'خريجة',
  suspended: 'موقوفة القيد',
};

export function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return typeof value === 'string' && (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

/** سجل حركات القيد على ملف الطالبة */
export const ENROLLMENT_ACTIONS = [
  'registered',
  'suspended',
  'reinstated',
  'graduated',
  'promoted',
  'level_changed',
  'transferred_in',
  'transferred_out',
] as const;
export type EnrollmentAction = (typeof ENROLLMENT_ACTIONS)[number];

export const SUSPENDED_LOGIN_ERROR_AR = 'تم وقف قيدكِ — تواصلي مع إدارة المركز لإعادة القيد';
