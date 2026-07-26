export const DEFAULT_GRADE_WEIGHTS = {
  attendance: 20,
  shortExam: 20,
  participation: 20,
  final: 40,
};

export type GradeWeights = {
  attendance: number;
  shortExam: number;
  participation: number;
  final: number;
};

export type GradeBreakdown = {
  attendance: number;
  shortExam: number;
  participation: number;
  final: number;
};

export const GRADE_LABEL_THRESHOLDS = [
  { min: 90, label: 'ممتاز' },
  { min: 80, label: 'جيد جداً' },
  { min: 70, label: 'جيد' },
  { min: 60, label: 'مقبول' },
  { min: 0, label: 'راسب' },
] as const;

export function getGradeLabel(total: number): string {
  for (const threshold of GRADE_LABEL_THRESHOLDS) {
    if (total >= threshold.min) {
      return threshold.label;
    }
  }
  return GRADE_LABEL_THRESHOLDS[GRADE_LABEL_THRESHOLDS.length - 1].label;
}

export function calculateGradeTotal(breakdown: GradeBreakdown): number {
  return breakdown.attendance + breakdown.shortExam + breakdown.participation + breakdown.final;
}
