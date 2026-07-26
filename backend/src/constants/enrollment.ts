export const ENROLLMENT_STATUSES = ['enrolled', 'graduated', 'suspended'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_STATUS_LABELS_AR: Record<EnrollmentStatus, string> = {
  enrolled: 'مسجّلة',
  graduated: 'خريجة',
  suspended: 'موقوف القيد',
};

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
  return (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

export const SUSPENDED_LOGIN_ERROR_AR =
  'الحساب موقوف القيد — تواصلي مع إدارة المركز';
