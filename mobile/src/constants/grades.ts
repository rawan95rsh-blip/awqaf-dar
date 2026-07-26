export const GRADE_WEIGHTS = {
  attendance: 20,
  shortExam: 20,
  participation: 20,
  final: 40,
} as const;

export type GradeWeights = {
  attendance: number;
  shortExam: number;
  participation: number;
  final: number;
};

export const GRADE_LABELS = [
  { min: 90, label: 'ممتاز', bg: '#dcfce7', text: '#166534' },
  { min: 80, label: 'جيد جداً', bg: '#e0e7ff', text: '#3730a3' },
  { min: 70, label: 'جيد', bg: '#dbeafe', text: '#1e40af' },
  { min: 60, label: 'مقبول', bg: '#fef3c7', text: '#92400e' },
  { min: 0, label: 'راسب', bg: '#fee2e2', text: '#b91c1c' },
] as const;

export function getGradeLabelInfo(total: number): (typeof GRADE_LABELS)[number] {
  for (const grade of GRADE_LABELS) {
    if (total >= grade.min) return grade;
  }
  return GRADE_LABELS[GRADE_LABELS.length - 1];
}

export function clampGradeValue(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}
