export const GENDER_AUDIENCE_VALUES = ["female", "male"] as const;

export type GenderAudience = (typeof GENDER_AUDIENCE_VALUES)[number];

export type StudentGender = GenderAudience;

export type AudienceFilter = "all" | GenderAudience;

export const GENDER_AUDIENCE_LABELS: Record<GenderAudience, string> = {
  female: "نسائي",
  male: "رجالي",
};

export const STUDENT_GENDER_LABELS: Record<StudentGender, string> = {
  female: "أنثى",
  male: "ذكر",
};

export const GENDER_AUDIENCE_OPTIONS: Array<{ id: GenderAudience; label: string }> =
  GENDER_AUDIENCE_VALUES.map((id) => ({
    id,
    label: GENDER_AUDIENCE_LABELS[id],
  }));

export const STUDENT_GENDER_OPTIONS: Array<{ id: StudentGender; label: string }> =
  GENDER_AUDIENCE_VALUES.map((id) => ({
    id,
    label: STUDENT_GENDER_LABELS[id],
  }));
