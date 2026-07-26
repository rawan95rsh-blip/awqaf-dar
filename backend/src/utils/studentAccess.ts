import type { Request } from 'express';

export function canAccessStudentRecord(req: Request, studentId: string | string[]): boolean {
  const normalizedId = Array.isArray(studentId) ? studentId[0] : studentId;
  if (!normalizedId) return false;
  if (!req.user) return false;

  if (req.user.role === 'student') {
    return req.user.studentId?.toString() === normalizedId;
  }

  return req.user.role === 'center_admin' && !!req.user.centerId;
}

export function getCenterIdForStudentAccess(req: Request): string | null {
  if (!req.user?.centerId) return null;
  return req.user.centerId.toString();
}
