export type SelectOption = {
  id: string;
  label: string;
};

export const NATIONALITY_OPTIONS: SelectOption[] = [
  { id: "KW", label: "الكويت" },
  { id: "SA", label: "السعودية" },
  { id: "AE", label: "الإمارات" },
  { id: "QA", label: "قطر" },
  { id: "BH", label: "البحرين" },
  { id: "OM", label: "عُمان" },
  { id: "EG", label: "مصر" },
  { id: "JO", label: "الأردن" },
  { id: "SY", label: "سوريا" },
  { id: "IQ", label: "العراق" },
  { id: "PS", label: "فلسطين" },
  { id: "LB", label: "لبنان" },
  { id: "YE", label: "اليمن" },
  { id: "SD", label: "السودان" },
  { id: "MA", label: "المغرب" },
  { id: "TN", label: "تونس" },
  { id: "DZ", label: "الجزائر" },
  { id: "OTHER", label: "أخرى" },
];

export const ACADEMIC_LEVEL_OPTIONS: SelectOption[] = [
  { id: "none", label: "لا يوجد" },
  { id: "middle", label: "متوسط" },
  { id: "high", label: "ثانوي" },
  { id: "university", label: "جامعي" },
  { id: "postgraduate", label: "دراسات عليا" },
  { id: "other", label: "أخرى" },
];
