/** فلتر الطالبات النشطات (غير المحذوفات كلياً) */
export const ACTIVE_STUDENT_FILTER = { deletedAt: null } as const;

export function isStudentActive(student: { deletedAt?: Date | null }): boolean {
  return student.deletedAt == null;
}
