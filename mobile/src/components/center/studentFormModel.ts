/**
 * منطق نموذج الطالبة (إضافة / تعديل) — بدون واجهة:
 * القيم الابتدائية، التحقق، وبناء الحمولة المرسلة للخادم.
 */
import type { StudentPayload } from "@/src/api/students";
import {
  trackRequiresLevel,
  validateCivilId,
  validatePassword,
  type DocumentKind,
  type Gender,
  type Occupation,
  type StudentTrack,
  type StudentType,
} from "@/src/constants/domain";
import {
  DEFAULT_COUNTRY,
  splitStoredPhone,
  toInternational,
  toLatinDigits,
  validatePhone,
  type PhoneCountry,
} from "@/src/constants/phone";
import type { HomeAddress, StudentProfile } from "@/src/types/student";
import type { PickedImage } from "@/src/ui";
import { toDateKey } from "@/src/utils/format";

export type StudentFormMode = "create" | "edit";

export type StudentFormValues = {
  fullName: string;
  idNumber: string;
  gender: Gender;
  nationality: string | null;
  dob: Date | null;
  academicLevel: string | null;
  occupation: Occupation | null;
  occupationOther: string;
  country: PhoneCountry;
  phone: string;
  address: HomeAddress;
  track: StudentTrack | null;
  trackNote: string;
  levelId: string | null;
  courseIds: string[];
  studentType: StudentType;
  notes: string;
  password: string;
  confirmPassword: string;
};

export type StudentDocuments = Record<DocumentKind, PickedImage | null>;

export type StudentFormErrors = Partial<Record<keyof StudentFormValues, string>>;

export const DOCUMENT_KINDS: DocumentKind[] = ["civilId", "photo", "qualification"];

export const EMPTY_DOCUMENTS: StudentDocuments = { civilId: null, photo: null, qualification: null };

const EMPTY_ADDRESS: HomeAddress = { area: "", block: "", street: "", avenue: "", house: "" };

export const EMPTY_STUDENT_FORM: StudentFormValues = {
  fullName: "",
  idNumber: "",
  gender: "female",
  nationality: "KW",
  dob: null,
  academicLevel: null,
  occupation: null,
  occupationOther: "",
  country: DEFAULT_COUNTRY,
  phone: "",
  address: EMPTY_ADDRESS,
  track: null,
  trackNote: "",
  levelId: null,
  courseIds: [],
  studentType: "new",
  notes: "",
  password: "",
  confirmPassword: "",
};

/** "2010-05-15T00:00:00.000Z" → تاريخ محلي لنفس اليوم (بدون انزياح المنطقة الزمنية) */
function parseDateOnly(value?: string | null): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formFromProfile(profile: StudentProfile): StudentFormValues {
  const { country, national } = splitStoredPhone(profile.phone);
  return {
    ...EMPTY_STUDENT_FORM,
    fullName: profile.fullName ?? "",
    idNumber: profile.idNumber ?? "",
    gender: profile.gender ?? "female",
    nationality: profile.nationality || null,
    dob: parseDateOnly(profile.dob),
    academicLevel: profile.academicLevel || null,
    occupation: profile.occupation ?? null,
    occupationOther: profile.occupationOther ?? "",
    country,
    phone: national,
    address: { ...EMPTY_ADDRESS, ...(profile.homeAddress ?? {}) },
    track: profile.track ?? null,
    trackNote: profile.trackNote ?? "",
    levelId: profile.levelId ?? null,
    courseIds: (profile.courses ?? []).map((c) => c.id),
    studentType: profile.studentType ?? "new",
    notes: profile.notes ?? "",
  };
}

export function validateStudentForm(values: StudentFormValues, mode: StudentFormMode): StudentFormErrors {
  const e: StudentFormErrors = {};
  if (values.fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = "اكتبي الاسم الكامل (اسمين على الأقل)";
  const civil = validateCivilId(values.idNumber);
  if (civil) e.idNumber = civil;
  if (!values.nationality) e.nationality = "اختاري الجنسية";
  if (!values.dob) e.dob = "اختاري تاريخ الميلاد";
  if (!values.academicLevel) e.academicLevel = "اختاري المؤهل الدراسي";
  if (values.occupation === "other" && !values.occupationOther.trim()) e.occupationOther = "اكتبي الوظيفة";
  const phone = validatePhone(values.phone, values.country);
  if (phone) e.phone = phone;
  if (!values.track) e.track = "اختاري المسار";
  if (trackRequiresLevel(values.track) && !values.levelId) e.levelId = "اختاري المستوى";
  if (values.track === "courses" && values.courseIds.length === 0) e.courseIds = "اختاري دورة واحدة على الأقل";
  if (values.track === "other" && !values.trackNote.trim()) e.trackNote = "وضّحي المسار";
  if (mode === "create") {
    const pass = validatePassword(values.password);
    if (pass) e.password = pass;
    else if (values.password !== values.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
  }
  return e;
}

function cleanAddress(address: HomeAddress): HomeAddress {
  return {
    area: address.area.trim(),
    block: address.block?.trim() ?? "",
    street: address.street?.trim() ?? "",
    avenue: address.avenue?.trim() ?? "",
    house: address.house?.trim() ?? "",
  };
}

/** الحمولة الكاملة لإضافة طالبة */
export function buildCreatePayload(values: StudentFormValues): StudentPayload {
  const address = cleanAddress(values.address);
  const hasAddress = Object.values(address).some(Boolean);
  return {
    fullName: values.fullName.trim(),
    idNumber: values.idNumber,
    gender: values.gender,
    nationality: values.nationality ?? undefined,
    dob: values.dob ? toDateKey(values.dob) : undefined,
    academicLevel: values.academicLevel ?? undefined,
    occupation: values.occupation ?? undefined,
    occupationOther: values.occupation === "other" ? values.occupationOther.trim() : "",
    phone: toLatinDigits(values.phone),
    countryCode: values.country.dialCode,
    homeAddress: hasAddress ? address : undefined,
    track: values.track ?? undefined,
    trackNote: values.track === "other" ? values.trackNote.trim() : "",
    levelId: trackRequiresLevel(values.track) ? values.levelId : null,
    courseIds: values.courseIds,
    studentType: values.studentType,
    notes: values.notes.trim(),
    password: values.password,
  };
}

const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** حمولة التعديل — الحقول المتغيرة فقط */
export function buildUpdatePayload(values: StudentFormValues, initial: StudentFormValues): StudentPayload {
  const payload: StudentPayload = {};
  const fullName = values.fullName.trim();
  if (fullName !== initial.fullName.trim()) payload.fullName = fullName;
  if (values.idNumber !== initial.idNumber) payload.idNumber = values.idNumber;
  if (values.gender !== initial.gender) payload.gender = values.gender;
  if (values.nationality && values.nationality !== initial.nationality) payload.nationality = values.nationality;
  if (values.academicLevel && values.academicLevel !== initial.academicLevel) payload.academicLevel = values.academicLevel;

  const dobKey = values.dob ? toDateKey(values.dob) : null;
  if (dobKey && dobKey !== (initial.dob ? toDateKey(initial.dob) : null)) payload.dob = dobKey;

  if (
    values.occupation &&
    (values.occupation !== initial.occupation || values.occupationOther.trim() !== initial.occupationOther.trim())
  ) {
    payload.occupation = values.occupation;
    payload.occupationOther = values.occupation === "other" ? values.occupationOther.trim() : "";
  }

  if (toInternational(values.phone, values.country) !== toInternational(initial.phone, initial.country)) {
    payload.phone = toLatinDigits(values.phone);
    payload.countryCode = values.country.dialCode;
  }

  const address = cleanAddress(values.address);
  if (JSON.stringify(address) !== JSON.stringify(cleanAddress(initial.address))) payload.homeAddress = address;

  // التسكين (المسار/المستوى/الدورات) يُرسل كاملاً عند تغيّر أي جزء منه ليتحقق الخادم من توافقه
  const placementChanged =
    values.track !== initial.track ||
    values.levelId !== initial.levelId ||
    !sameList(values.courseIds, initial.courseIds) ||
    values.trackNote.trim() !== initial.trackNote.trim();
  if (placementChanged && values.track) {
    payload.track = values.track;
    payload.trackNote = values.track === "other" ? values.trackNote.trim() : "";
    payload.courseIds = values.courseIds;
    // مسار الدورات/أخرى بلا مستوى — نرسل null ليُزال المستوى السابق
    payload.levelId = trackRequiresLevel(values.track) ? values.levelId : null;
  }

  if (values.studentType !== initial.studentType) payload.studentType = values.studentType;
  if (values.notes.trim() !== initial.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

export function pickedDocuments(documents: StudentDocuments): Partial<StudentDocuments> {
  return Object.fromEntries(Object.entries(documents).filter(([, image]) => !!image)) as Partial<StudentDocuments>;
}
