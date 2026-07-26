export const ENROLLMENT_STATUSES = ['enrolled', 'graduated', 'suspended'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: 'مسجّلة',
  graduated: 'خريجة',
  suspended: 'موقوف القيد',
};

export const ENROLLMENT_STATUS_OPTIONS: Array<{
  id: EnrollmentStatus;
  label: string;
}> = ENROLLMENT_STATUSES.map((id) => ({
  id,
  label: ENROLLMENT_STATUS_LABELS[id],
}));
