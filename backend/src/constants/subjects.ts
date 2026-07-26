export const SUBJECT_COUNT = 7;

export const MIN_SUBJECT_INDEX = 0;
export const MAX_SUBJECT_INDEX = SUBJECT_COUNT - 1;

export function isValidSubjectIndex(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SUBJECT_INDEX && value <= MAX_SUBJECT_INDEX;
}
