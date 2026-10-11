import { useCallback, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { space } from "@/src/theme";
import {
  Banner,
  Card,
  ChoiceCards,
  ChoiceChips,
  DateField,
  ImagePickerField,
  PhoneField,
  Section,
  SelectField,
  TextField,
} from "@/src/ui";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { coursesQueryKeys, listCourses } from "@/src/api/courses";
import {
  ACADEMIC_LEVEL_OPTIONS,
  CIVIL_ID_LENGTH,
  DOCUMENT_META,
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
  OCCUPATION_OPTIONS,
  PASSWORD_HINT,
  STUDENT_TYPE_OPTIONS,
  TRACK_OPTIONS,
  trackRequiresLevel,
  type DocumentKind,
  type Gender,
  type Occupation,
  type StudentType,
} from "@/src/constants/domain";
import { toLatinDigits } from "@/src/constants/phone";
import type { DocumentEntry, HomeAddress } from "@/src/types/student";
import {
  DOCUMENT_KINDS,
  EMPTY_DOCUMENTS,
  validateStudentForm,
  type StudentDocuments,
  type StudentFormErrors,
  type StudentFormMode,
  type StudentFormValues,
} from "./studentFormModel";

// ———— حالة النموذج ————

export function useStudentForm(initial: StudentFormValues, mode: StudentFormMode) {
  const [values, setValues] = useState<StudentFormValues>(initial);
  const [documents, setDocuments] = useState<StudentDocuments>(EMPTY_DOCUMENTS);
  const [errors, setErrors] = useState<StudentFormErrors>({});

  const set = useCallback(<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const setAddress = useCallback((patch: Partial<HomeAddress>) => {
    setValues((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  }, []);

  const setDocument = useCallback((kind: DocumentKind, image: StudentDocuments[DocumentKind]) => {
    setDocuments((prev) => ({ ...prev, [kind]: image }));
  }, []);

  /** يتحقق ويعرض الأخطاء — يعيد true إن كان النموذج سليماً */
  const validate = useCallback((): boolean => {
    const next = validateStudentForm(values, mode);
    setErrors(next);
    return Object.values(next).every((v) => !v);
  }, [values, mode]);

  const hasNewDocuments = Object.values(documents).some(Boolean);
  const errorCount = Object.values(errors).filter(Boolean).length;

  return { values, set, setAddress, documents, setDocument, errors, errorCount, validate, hasNewDocuments };
}

export type StudentFormState = ReturnType<typeof useStudentForm>;

// ———— الواجهة ————

function FormCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Section title={title} subtitle={subtitle}>
      <Card padding={4} style={styles.card}>
        {children}
      </Card>
    </Section>
  );
}

type StudentFormProps = {
  form: StudentFormState;
  mode: StudentFormMode;
  centerId: string;
  /** المرفقات المحفوظة (وضع التعديل) */
  existingDocuments?: Partial<Record<DocumentKind, DocumentEntry>>;
  /** رسالة خطأ من الخادم */
  submitError?: string | null;
};

/** نموذج بيانات الطالبة — مشترك بين «إضافة طالبة» و«تعديل البيانات» */
export default function StudentForm({ form, mode, centerId, existingDocuments, submitError }: StudentFormProps) {
  const { values, set, setAddress, documents, setDocument, errors, errorCount } = form;

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });
  const coursesQuery = useQuery({ queryKey: coursesQueryKeys.list(), queryFn: listCourses });

  const levelOptions = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .filter((l) => l.track === values.track)
        .sort((a, b) => a.order - b.order)
        .map((l) => ({ id: l.id, label: l.shortName || l.fullName, description: l.fullName })),
    [levelsQuery.data, values.track]
  );
  const courseOptions = (coursesQuery.data ?? []).map((c) => ({ id: c.id, label: c.name, description: c.description }));
  const showCourses = courseOptions.length > 0 || values.track === "courses";

  return (
    <View>
      {submitError ? (
        <Banner tone="danger" title="تعذّر الحفظ">
          {submitError}
        </Banner>
      ) : errorCount > 0 ? (
        <Banner tone="danger" title="راجعي الحقول المظللة">
          {`${errorCount} ${errorCount === 1 ? "حقل يحتاج" : "حقول تحتاج"} إلى تصحيح`}
        </Banner>
      ) : null}

      <FormCard title="البيانات الشخصية">
        <TextField
          label="الاسم الكامل"
          required
          value={values.fullName}
          onChangeText={(v) => set("fullName", v)}
          placeholder="الاسم كما في البطاقة المدنية"
          autoComplete="name"
          textContentType="name"
          error={errors.fullName}
        />
        <TextField
          label="الرقم المدني"
          required
          value={values.idNumber}
          onChangeText={(v) => set("idNumber", toLatinDigits(v).slice(0, CIVIL_ID_LENGTH))}
          keyboardType="number-pad"
          placeholder="12 رقماً"
          maxLength={CIVIL_ID_LENGTH}
          ltr
          icon="card-account-details-outline"
          error={errors.idNumber}
        />
        <ChoiceChips<Gender>
          label="الجنس"
          required
          options={GENDER_OPTIONS}
          value={values.gender}
          onChange={(v: Gender) => set("gender", v)}
        />
        <SelectField
          label="الجنسية"
          required
          options={NATIONALITY_OPTIONS}
          value={values.nationality}
          onChange={(v) => set("nationality", v)}
          error={errors.nationality}
        />
        <DateField
          label="تاريخ الميلاد"
          required
          value={values.dob}
          onChange={(d) => set("dob", d)}
          maximumDate={new Date()}
          initialDate={new Date(1995, 0, 1)}
          error={errors.dob}
        />
        <SelectField
          label="المؤهل الدراسي"
          required
          options={ACADEMIC_LEVEL_OPTIONS}
          value={values.academicLevel}
          onChange={(v) => set("academicLevel", v)}
          error={errors.academicLevel}
        />
        <ChoiceChips<Occupation>
          label="الوظيفة الحالية"
          options={OCCUPATION_OPTIONS}
          value={values.occupation}
          onChange={(v: Occupation) => set("occupation", v)}
        />
        {values.occupation === "other" ? (
          <TextField
            label="اكتبي الوظيفة"
            required
            value={values.occupationOther}
            onChangeText={(v) => set("occupationOther", v)}
            error={errors.occupationOther}
          />
        ) : null}
      </FormCard>

      <FormCard title="التواصل والسكن">
        <PhoneField
          required
          country={values.country}
          onCountryChange={(c) => set("country", c)}
          value={values.phone}
          onChangeText={(v) => set("phone", v)}
          error={errors.phone}
          hint="تدخل به الطالبة إلى التطبيق"
        />
        <TextField
          label="المنطقة"
          value={values.address.area}
          onChangeText={(v) => setAddress({ area: v })}
          placeholder="مثال: السالمية"
        />
        <View style={styles.row}>
          <TextField
            label="القطعة"
            value={values.address.block}
            onChangeText={(v) => setAddress({ block: v })}
            keyboardType="number-pad"
            containerStyle={styles.flex}
          />
          <TextField
            label="الشارع"
            value={values.address.street}
            onChangeText={(v) => setAddress({ street: v })}
            containerStyle={styles.flex}
          />
        </View>
        <View style={styles.row}>
          <TextField
            label="الجادة"
            value={values.address.avenue}
            onChangeText={(v) => setAddress({ avenue: v })}
            containerStyle={styles.flex}
          />
          <TextField
            label="المنزل"
            value={values.address.house}
            onChangeText={(v) => setAddress({ house: v })}
            containerStyle={styles.flex}
          />
        </View>
      </FormCard>

      {mode === "create" ? (
        <FormCard title="بيانات الدخول" subtitle="تدخل بها الطالبة مع رقم هاتفها أو رقمها المدني">
          <TextField
            label="كلمة المرور"
            required
            value={values.password}
            onChangeText={(v) => set("password", toLatinDigits(v))}
            secureTextEntry
            keyboardType="number-pad"
            textContentType="newPassword"
            icon="lock-outline"
            hint={PASSWORD_HINT}
            error={errors.password}
          />
          <TextField
            label="تأكيد كلمة المرور"
            required
            value={values.confirmPassword}
            onChangeText={(v) => set("confirmPassword", toLatinDigits(v))}
            secureTextEntry
            keyboardType="number-pad"
            icon="lock-check-outline"
            error={errors.confirmPassword}
          />
        </FormCard>
      ) : null}

      <FormCard title="المسار والمستوى">
        <ChoiceCards
          label="المسار"
          required
          options={TRACK_OPTIONS}
          value={values.track}
          onChange={(track) => {
            set("track", track);
            // المستوى يتبع المسار — يُلغى إن لم يعد متوافقاً
            const level = levelsQuery.data?.find((l) => l.id === values.levelId);
            if (!trackRequiresLevel(track) || (level && level.track !== track)) set("levelId", null);
          }}
          error={errors.track}
        />
        {trackRequiresLevel(values.track) ? (
          <SelectField
            label={values.track === "preparatory" ? "مستوى التمهيدي" : "مستوى المطور"}
            required
            options={levelOptions}
            value={values.levelId}
            onChange={(v) => set("levelId", v)}
            disabled={levelsQuery.isLoading}
            placeholder={levelsQuery.isLoading ? "جاري تحميل المستويات…" : "اختاري المستوى"}
            emptyText="لا توجد مستويات في هذا المسار — أضيفيها من «المزيد»"
            error={errors.levelId ?? (levelsQuery.isError ? "تعذّر تحميل المستويات" : undefined)}
          />
        ) : null}
        {values.track === "other" ? (
          <TextField
            label="وضّحي المسار"
            required
            value={values.trackNote}
            onChangeText={(v) => set("trackNote", v)}
            placeholder="مثال: حلقة تلاوة مسائية"
            error={errors.trackNote}
          />
        ) : null}
        {showCourses ? (
          <SelectField
            multiple
            label="الدورات العلمية"
            required={values.track === "courses"}
            options={courseOptions}
            value={values.courseIds}
            onChange={(ids) => set("courseIds", ids)}
            disabled={courseOptions.length === 0}
            placeholder={
              coursesQuery.isLoading
                ? "جاري تحميل الدورات…"
                : courseOptions.length
                  ? "اختاري دورة أو أكثر"
                  : "لا توجد دورات — أضيفيها من «المزيد»"
            }
            hint={
              values.track !== "courses"
                ? "اختياري — الاشتراك في دورة لا يمنع التسجيل في المطور أو التمهيدي"
                : undefined
            }
            error={errors.courseIds}
          />
        ) : null}
        <ChoiceChips<StudentType>
          label="حالة الطالبة"
          required
          options={STUDENT_TYPE_OPTIONS}
          value={values.studentType}
          onChange={(v: StudentType) => set("studentType", v)}
        />
      </FormCard>

      <FormCard title="الملاحظات">
        <TextField
          label="ملاحظات للمعلمات"
          value={values.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="مثال: مقدار الحفظ السابق، ظروف خاصة، أوقات مناسبة…"
          multiline
          maxLength={1000}
          showCounter
        />
      </FormCard>

      <FormCard
        title="المرفقات"
        subtitle={mode === "create" ? "اختيارية — يمكنكِ إضافتها لاحقاً" : "اختاري صورة جديدة لاستبدال المرفق المحفوظ"}
      >
        {DOCUMENT_KINDS.map((kind) => (
          <ImagePickerField
            key={kind}
            label={DOCUMENT_META[kind].label}
            description={DOCUMENT_META[kind].description}
            icon={DOCUMENT_META[kind].icon}
            value={documents[kind]}
            existingUrl={existingDocuments?.[kind]?.url}
            onChange={(image) => setDocument(kind, image)}
            aspect={kind === "photo" ? [3, 4] : undefined}
          />
        ))}
      </FormCard>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[4] },
  row: { flexDirection: "row", gap: space[3] },
});
