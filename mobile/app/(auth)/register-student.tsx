import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import {
  Banner,
  Button,
  Card,
  ChoiceCards,
  ChoiceChips,
  DateField,
  Header,
  ImagePickerField,
  InfoRow,
  PhoneField,
  Screen,
  SelectField,
  Steps,
  Text,
  TextField,
  type PickedImage,
} from "@/src/ui";
import {
  fetchCenterCourses,
  fetchLevelsByCenter,
  fetchPublicCenters,
  submitRegistrationRequest,
} from "@/src/api/registrationRequests";
import {
  ACADEMIC_LEVEL_OPTIONS,
  CENTER_AUDIENCE_LABELS,
  CIVIL_ID_LENGTH,
  DOCUMENT_META,
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
  OCCUPATION_OPTIONS,
  PASSWORD_HINT,
  STUDENT_TYPE_OPTIONS,
  TRACK_LABELS,
  TRACK_OPTIONS,
  academicLevelLabel,
  nationalityLabel,
  occupationLabel,
  trackRequiresLevel,
  validateCivilId,
  validatePassword,
  type DocumentKind,
  type Gender,
  type Occupation,
  type StudentTrack,
  type StudentType,
} from "@/src/constants/domain";
import { DEFAULT_COUNTRY, formatPhone, toInternational, toLatinDigits, validatePhone } from "@/src/constants/phone";
import { formatAddress, type HomeAddress } from "@/src/types/student";
import { hasCenterLocation, openCenterInMaps } from "@/src/utils/maps";
import { formatDateLong } from "@/src/utils/format";

const STEPS = ["البيانات الشخصية", "التواصل والسكن", "المركز والمسار", "المرفقات والمراجعة"];

type Form = {
  fullName: string;
  idNumber: string;
  gender: Gender | null;
  nationality: string | null;
  dob: Date | null;
  academicLevel: string | null;
  occupation: Occupation | null;
  occupationOther: string;
  phone: string;
  address: HomeAddress;
  password: string;
  confirmPassword: string;
  centerId: string | null;
  track: StudentTrack | null;
  trackNote: string;
  levelId: string | null;
  courseIds: string[];
  studentType: StudentType | null;
  notes: string;
};

const INITIAL: Form = {
  fullName: "",
  idNumber: "",
  gender: null,
  nationality: "KW",
  dob: null,
  academicLevel: null,
  occupation: null,
  occupationOther: "",
  phone: "",
  address: { area: "", block: "", street: "", avenue: "", house: "" },
  password: "",
  confirmPassword: "",
  centerId: null,
  track: null,
  trackNote: "",
  levelId: null,
  courseIds: [],
  studentType: null,
  notes: "",
};

type Errors = Partial<Record<string, string>>;

export default function RegisterStudentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(INITIAL);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [docs, setDocs] = useState<Record<DocumentKind, PickedImage | null>>({
    civilId: null,
    photo: null,
    qualification: null,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: undefined }));
  };

  const centersQuery = useQuery({
    queryKey: ["public-centers", form.gender],
    queryFn: () => fetchPublicCenters(form.gender ?? "all"),
    enabled: !!form.gender,
  });

  const levelsQuery = useQuery({
    queryKey: ["center-levels", form.centerId],
    queryFn: () => fetchLevelsByCenter(form.centerId!),
    enabled: !!form.centerId,
  });

  const coursesQuery = useQuery({
    queryKey: ["center-courses", form.centerId],
    queryFn: () => fetchCenterCourses(form.centerId!),
    enabled: !!form.centerId,
  });

  const selectedCenter = (centersQuery.data ?? []).find((c) => c.id === form.centerId) ?? null;
  const levelOptions = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .filter((l) => l.track === form.track)
        .map((l) => ({ id: l.id, label: l.shortName, description: l.fullName })),
    [levelsQuery.data, form.track]
  );
  const courseOptions = (coursesQuery.data ?? []).map((c) => ({ id: c.id, label: c.name, description: c.description }));
  const qualificationRequired = !!form.academicLevel && form.academicLevel !== "none";

  const mutation = useMutation({
    mutationFn: () =>
      submitRegistrationRequest(
        {
          fullName: form.fullName.trim(),
          idNumber: form.idNumber,
          gender: form.gender!,
          nationality: form.nationality!,
          dob: form.dob!.toISOString().slice(0, 10),
          academicLevel: form.academicLevel!,
          occupation: form.occupation!,
          occupationOther: form.occupationOther.trim(),
          phone: toLatinDigits(form.phone),
          countryCode: country.dialCode,
          homeAddress: form.address,
          password: form.password,
          centerId: form.centerId!,
          track: form.track!,
          trackNote: form.trackNote.trim(),
          levelId: trackRequiresLevel(form.track) ? form.levelId : null,
          courseIds: form.courseIds,
          studentType: form.studentType!,
          notes: form.notes.trim(),
        },
        { civilId: docs.civilId, photo: docs.photo, qualification: qualificationRequired ? docs.qualification : null }
      ),
    onSuccess: () => setSubmitted(true),
  });

  const validateStep = (index: number): Errors => {
    const e: Errors = {};
    if (index === 0) {
      if (form.fullName.trim().split(/\s+/).length < 2) e.fullName = "اكتبي الاسم الكامل (اسمين على الأقل)";
      const civil = validateCivilId(form.idNumber);
      if (civil) e.idNumber = civil;
      if (!form.gender) e.gender = "اختاري الجنس";
      if (!form.nationality) e.nationality = "اختاري الجنسية";
      if (!form.dob) e.dob = "اختاري تاريخ الميلاد";
      if (!form.academicLevel) e.academicLevel = "اختاري المؤهل الدراسي";
      if (!form.occupation) e.occupation = "اختاري الوظيفة الحالية";
      if (form.occupation === "other" && !form.occupationOther.trim()) e.occupationOther = "اكتبي الوظيفة";
    }
    if (index === 1) {
      const phone = validatePhone(form.phone, country);
      if (phone) e.phone = phone;
      if (!form.address.area.trim()) e.area = "اكتبي المنطقة";
      const pass = validatePassword(form.password);
      if (pass) e.password = pass;
      else if (form.password !== form.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
    }
    if (index === 2) {
      if (!form.centerId) e.centerId = "اختاري المركز";
      if (!form.track) e.track = "اختاري مسار الانضمام";
      if (trackRequiresLevel(form.track) && !form.levelId) e.levelId = "اختاري المستوى";
      if (form.track === "courses" && form.courseIds.length === 0) e.courseIds = "اختاري دورة واحدة على الأقل";
      if (form.track === "other" && !form.trackNote.trim()) e.trackNote = "وضّحي المسار المطلوب";
      if (!form.studentType) e.studentType = "حدّدي: مستجدة أم مستمرة";
    }
    if (index === 3) {
      if (!docs.civilId) e.civilId = "أرفقي صورة البطاقة المدنية";
      if (!docs.photo) e.photo = "أرفقي الصورة الشخصية";
      if (qualificationRequired && !docs.qualification) e.qualification = "أرفقي صورة آخر مؤهل";
    }
    return e;
  };

  const next = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    mutation.mutate();
  };

  const back = () => (step === 0 ? router.back() : setStep(step - 1));

  if (submitted) {
    return (
      <Screen
        footer={
          <Button fullWidth size="lg" onPress={() => router.replace("/(auth)/login" as Href)}>
            العودة لتسجيل الدخول
          </Button>
        }
      >
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-decagram" size={56} color={colors.primary} />
          </View>
          <Text variant="title" align="center">
            تم إرسال طلبكِ بنجاح
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {`ستراجع إدارة ${selectedCenter?.nameAr ?? "المركز"} طلبكِ ومرفقاتكِ، وسيصلكِ إشعار عند القبول. بعدها يمكنكِ الدخول برقمكِ المدني أو هاتفكِ.`}
          </Text>
          <Card tone="primary" style={styles.successCard}>
            <InfoRow label="الرقم المدني" value={form.idNumber} />
            <InfoRow label="الهاتف" value={formatPhone(toInternational(form.phone, country))} />
            <InfoRow label="المسار" value={form.track ? TRACK_LABELS[form.track] : ""} last />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scrollKey={step}
      header={<Header title="تسجيل طالبة جديدة" onBack={back} />}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button variant="secondary" onPress={() => setStep(step - 1)} style={styles.footerBack} disabled={mutation.isPending}>
              السابق
            </Button>
          ) : null}
          <Button
            onPress={next}
            loading={mutation.isPending}
            style={styles.flex}
            icon={step === STEPS.length - 1 ? "send" : undefined}
            size="lg"
          >
            {step === STEPS.length - 1 ? "إرسال الطلب" : "التالي"}
          </Button>
        </View>
      }
    >
      <Steps steps={STEPS} current={step} />

      <View style={styles.form}>
        {mutation.isError ? <Banner tone="danger" title="تعذّر إرسال الطلب">{(mutation.error as Error).message}</Banner> : null}

        {step === 0 ? (
          <>
            <TextField
              label="الاسم الكامل"
              required
              value={form.fullName}
              onChangeText={(v) => set("fullName", v)}
              placeholder="الاسم كما في البطاقة المدنية"
              autoComplete="name"
              textContentType="name"
              error={errors.fullName}
            />
            <TextField
              label="الرقم المدني"
              required
              value={form.idNumber}
              onChangeText={(v) => set("idNumber", toLatinDigits(v).slice(0, CIVIL_ID_LENGTH))}
              keyboardType="number-pad"
              placeholder="12 رقماً"
              maxLength={CIVIL_ID_LENGTH}
              ltr
              icon="card-account-details-outline"
              error={errors.idNumber}
            />
            <ChoiceChips
              label="الجنس"
              required
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(v: Gender) => {
                set("gender", v);
                set("centerId", null);
                set("levelId", null);
                set("courseIds", []);
              }}
              error={errors.gender}
            />
            <SelectField
              label="الجنسية"
              required
              options={NATIONALITY_OPTIONS}
              value={form.nationality}
              onChange={(v) => set("nationality", v)}
              error={errors.nationality}
            />
            <DateField
              label="تاريخ الميلاد"
              required
              value={form.dob}
              onChange={(d) => set("dob", d)}
              maximumDate={new Date()}
              initialDate={new Date(1995, 0, 1)}
              error={errors.dob}
            />
            <SelectField
              label="المؤهل الدراسي"
              required
              options={ACADEMIC_LEVEL_OPTIONS}
              value={form.academicLevel}
              onChange={(v) => set("academicLevel", v)}
              error={errors.academicLevel}
            />
            <ChoiceChips
              label="الوظيفة الحالية"
              required
              options={OCCUPATION_OPTIONS}
              value={form.occupation}
              onChange={(v: Occupation) => set("occupation", v)}
              error={errors.occupation}
            />
            {form.occupation === "other" ? (
              <TextField
                label="اكتبي الوظيفة"
                required
                value={form.occupationOther}
                onChangeText={(v) => set("occupationOther", v)}
                error={errors.occupationOther}
              />
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <PhoneField
              required
              country={country}
              onCountryChange={setCountry}
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              error={errors.phone}
              hint="يُستخدم لتسجيل الدخول والتواصل"
            />
            <Card padding={4} style={styles.group}>
              <Text variant="bodyStrong">عنوان السكن</Text>
              <TextField
                label="المنطقة"
                required
                value={form.address.area}
                onChangeText={(v) => {
                  set("address", { ...form.address, area: v });
                  if (errors.area) setErrors((p) => ({ ...p, area: undefined }));
                }}
                placeholder="مثال: السالمية"
                error={errors.area}
              />
              <View style={styles.row}>
                <TextField
                  label="القطعة"
                  value={form.address.block}
                  onChangeText={(v) => set("address", { ...form.address, block: v })}
                  keyboardType="number-pad"
                  containerStyle={styles.flex}
                />
                <TextField
                  label="الشارع"
                  value={form.address.street}
                  onChangeText={(v) => set("address", { ...form.address, street: v })}
                  containerStyle={styles.flex}
                />
              </View>
              <View style={styles.row}>
                <TextField
                  label="الجادة"
                  value={form.address.avenue}
                  onChangeText={(v) => set("address", { ...form.address, avenue: v })}
                  containerStyle={styles.flex}
                />
                <TextField
                  label="المنزل"
                  value={form.address.house}
                  onChangeText={(v) => set("address", { ...form.address, house: v })}
                  containerStyle={styles.flex}
                />
              </View>
            </Card>
            <TextField
              label="كلمة المرور"
              required
              value={form.password}
              onChangeText={(v) => set("password", toLatinDigits(v))}
              secureTextEntry
              keyboardType="number-pad"
              textContentType="newPassword"
              hint={PASSWORD_HINT}
              error={errors.password}
            />
            <TextField
              label="تأكيد كلمة المرور"
              required
              value={form.confirmPassword}
              onChangeText={(v) => set("confirmPassword", toLatinDigits(v))}
              secureTextEntry
              keyboardType="number-pad"
              error={errors.confirmPassword}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <SelectField
              label="المركز"
              required
              options={(centersQuery.data ?? []).map((c) => ({
                id: c.id,
                label: c.nameAr,
                description: [CENTER_AUDIENCE_LABELS[c.genderAudience], c.city].filter(Boolean).join(" · "),
              }))}
              value={form.centerId}
              onChange={(id) => {
                set("centerId", id);
                set("levelId", null);
                set("courseIds", []);
              }}
              placeholder={centersQuery.isLoading ? "جاري تحميل المراكز…" : "اختاري المركز"}
              disabled={centersQuery.isLoading}
              emptyText="لا توجد مراكز متاحة حالياً"
              error={errors.centerId ?? (centersQuery.isError ? "تعذّر تحميل المراكز" : undefined)}
            />
            {selectedCenter && hasCenterLocation(selectedCenter) ? (
              <Card tone="primary" padding={3} onPress={() => openCenterInMaps(selectedCenter)} style={styles.centerCard}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
                <Text variant="caption" style={styles.flex} numberOfLines={2}>
                  {[selectedCenter.addressText, selectedCenter.city].filter(Boolean).join("، ")}
                </Text>
                <Text variant="label" color="primary">
                  الخرائط
                </Text>
              </Card>
            ) : null}

            <ChoiceCards
              label="مسار الانضمام"
              required
              options={TRACK_OPTIONS}
              value={form.track}
              onChange={(v) => {
                set("track", v);
                set("levelId", null);
              }}
              error={errors.track}
            />

            {trackRequiresLevel(form.track) ? (
              <SelectField
                label={form.track === "preparatory" ? "مستوى التمهيدي" : "مستوى المطور"}
                required
                options={levelOptions}
                value={form.levelId}
                onChange={(v) => set("levelId", v)}
                disabled={!form.centerId || levelsQuery.isLoading}
                placeholder={!form.centerId ? "اختاري المركز أولاً" : "اختاري المستوى"}
                error={errors.levelId}
              />
            ) : null}

            {form.track === "other" ? (
              <TextField
                label="وضّحي المسار"
                required
                value={form.trackNote}
                onChangeText={(v) => set("trackNote", v)}
                placeholder="مثال: حلقة تلاوة مسائية"
                error={errors.trackNote}
              />
            ) : null}

            {form.centerId && (courseOptions.length > 0 || form.track === "courses") ? (
              <SelectField
                multiple
                label="الدورات العلمية"
                required={form.track === "courses"}
                options={courseOptions}
                value={form.courseIds}
                onChange={(ids) => set("courseIds", ids)}
                placeholder={courseOptions.length ? "اختاري دورة أو أكثر" : "لا توجد دورات في هذا المركز"}
                disabled={courseOptions.length === 0}
                hint={form.track !== "courses" ? "اختياري — الاشتراك في دورة لا يمنع التسجيل في المطور أو التمهيدي" : undefined}
                error={errors.courseIds}
              />
            ) : null}

            <ChoiceChips
              label="حالة الطالبة"
              required
              options={STUDENT_TYPE_OPTIONS}
              value={form.studentType}
              onChange={(v: StudentType) => set("studentType", v)}
              error={errors.studentType}
            />

            <TextField
              label="ملاحظات"
              value={form.notes}
              onChangeText={(v) => set("notes", v)}
              placeholder="مثال: مقدار الحفظ السابق، أوقات مناسبة، احتياجات خاصة…"
              multiline
              maxLength={1000}
              showCounter
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text variant="caption" color="textSecondary">
              ارفعي صوراً واضحة — تُضغط تلقائياً قبل الإرسال ولا يطّلع عليها إلا إدارة المركز.
            </Text>
            {(["civilId", "photo", "qualification"] as DocumentKind[])
              .filter((kind) => kind !== "qualification" || qualificationRequired)
              .map((kind) => (
                <ImagePickerField
                  key={kind}
                  label={DOCUMENT_META[kind].label}
                  description={DOCUMENT_META[kind].description}
                  icon={DOCUMENT_META[kind].icon}
                  required
                  value={docs[kind]}
                  onChange={(img) => {
                    setDocs((prev) => ({ ...prev, [kind]: img }));
                    if (errors[kind]) setErrors((p) => ({ ...p, [kind]: undefined }));
                  }}
                  aspect={kind === "photo" ? [3, 4] : undefined}
                  error={errors[kind]}
                />
              ))}

            <Card padding={4}>
              <Text variant="headline" style={styles.reviewTitle}>
                مراجعة الطلب
              </Text>
              <InfoRow label="الاسم" value={form.fullName} />
              <InfoRow label="الرقم المدني" value={form.idNumber} />
              <InfoRow label="الجنسية" value={nationalityLabel(form.nationality)} />
              <InfoRow label="تاريخ الميلاد" value={form.dob ? formatDateLong(form.dob) : ""} />
              <InfoRow label="المؤهل" value={academicLevelLabel(form.academicLevel)} />
              <InfoRow label="الوظيفة" value={occupationLabel(form.occupation, form.occupationOther)} />
              <InfoRow label="الهاتف" value={formatPhone(toInternational(form.phone, country))} />
              <InfoRow label="السكن" value={formatAddress(form.address)} />
              <InfoRow label="المركز" value={selectedCenter?.nameAr} />
              <InfoRow
                label="المسار"
                value={[
                  form.track ? TRACK_LABELS[form.track] : "",
                  levelOptions.find((l) => l.id === form.levelId)?.label,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              />
              <InfoRow
                label="الدورات"
                value={courseOptions.filter((c) => form.courseIds.includes(c.id)).map((c) => c.label).join("، ")}
              />
              <InfoRow
                label="الحالة"
                value={STUDENT_TYPE_OPTIONS.find((o) => o.id === form.studentType)?.label}
                last
              />
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: space[5], marginTop: space[5] },
  row: { flexDirection: "row", gap: space[3] },
  group: { gap: space[4] },
  footer: { flexDirection: "row", gap: space[3] },
  footerBack: { minWidth: 100 },
  centerCard: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: -space[2] },
  reviewTitle: { marginBottom: space[1] },
  success: { alignItems: "center", gap: space[4], paddingTop: space[10] },
  successIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[2],
  },
  successCard: { alignSelf: "stretch", marginTop: space[4], borderRadius: radius.lg },
});
