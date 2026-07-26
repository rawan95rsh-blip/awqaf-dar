import {
  DEFAULT_GRADE_WEIGHTS,
  type GradeBreakdown,
  type GradeWeights,
} from '../constants/grades';
import { Center } from '../models/Center';
import type mongoose from 'mongoose';

export function normalizeGradeWeights(weights: Partial<GradeWeights>): GradeWeights | null {
  const fields = ['attendance', 'shortExam', 'participation', 'final'] as const;
  const normalized: GradeWeights = {
    attendance: 0,
    shortExam: 0,
    participation: 0,
    final: 0,
  };

  for (const field of fields) {
    const value = weights[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      return null;
    }
    if (value < 1 || value > 100) {
      return null;
    }
    normalized[field] = value;
  }

  const total =
    normalized.attendance + normalized.shortExam + normalized.participation + normalized.final;

  if (total !== 100) {
    return null;
  }

  return normalized;
}

export function validateGradeWeightsInput(weights: Partial<GradeWeights>): string | null {
  const fields = ['attendance', 'shortExam', 'participation', 'final'] as const;

  for (const field of fields) {
    const value = weights[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      return 'أوزان الدرجات غير صالحة';
    }
    if (value < 1 || value > 100) {
      return `وزن ${field} يجب أن يكون بين 1 و 100`;
    }
  }

  const total =
    (weights.attendance ?? 0) +
    (weights.shortExam ?? 0) +
    (weights.participation ?? 0) +
    (weights.final ?? 0);

  if (total !== 100) {
    return 'مجموع أوزان الدرجات يجب أن يساوي 100';
  }

  return null;
}

export async function getCenterGradeWeights(
  centerId: mongoose.Types.ObjectId
): Promise<GradeWeights> {
  const center = await Center.findById(centerId).select('gradeWeights').lean();
  if (!center?.gradeWeights) {
    return { ...DEFAULT_GRADE_WEIGHTS };
  }

  return {
    attendance: center.gradeWeights.attendance,
    shortExam: center.gradeWeights.shortExam,
    participation: center.gradeWeights.participation,
    final: center.gradeWeights.final,
  };
}

export function validateBreakdownAgainstWeights(
  breakdown: GradeBreakdown,
  weights: GradeWeights
): string | null {
  if (breakdown.attendance < 0 || breakdown.attendance > weights.attendance) {
    return `درجة الحضور يجب أن تكون بين 0 و ${weights.attendance}`;
  }

  if (breakdown.shortExam < 0 || breakdown.shortExam > weights.shortExam) {
    return `درجة الاختبار القصير يجب أن تكون بين 0 و ${weights.shortExam}`;
  }

  if (breakdown.participation < 0 || breakdown.participation > weights.participation) {
    return `درجة المشاركة يجب أن تكون بين 0 و ${weights.participation}`;
  }

  if (breakdown.final < 0 || breakdown.final > weights.final) {
    return `درجة الاختبار النهائي يجب أن تكون بين 0 و ${weights.final}`;
  }

  return null;
}
