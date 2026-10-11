import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import {
  Banner,
  Button,
  Card,
  ChoiceCards,
  ChoiceChips,
  Header,
  InfoRow,
  Screen,
  SelectField,
  Steps,
  Text,
  TextField,
  useToast,
} from "@/src/ui";
import TimeField from "@/src/components/levels/TimeField";
import {
  DEFAULT_WEIGHTS,
  WEIGHT_FIELDS,
  durationLabel,
  isValidTime,
  minutesOf,
  normalizeTime,
  parseScore,
  sumWeights,
  timeRangeLabel,
} from "@/src/components/levels/helpers";
import { useAuth } from "@/src/context/AuthContext";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { classOffersQueryKeys, createClassOffer, levelsOfTrack, listClassOffers } from "@/src/api/classOffers";
import { coursesQueryKeys, listCourses } from "@/src/api/courses";
import { sessionsQueryKeys } from "@/src/api/sessions";
import { fetchGradeWeights, settingsQueryKeys } from "@/src/api/settings";
import {
  CLASS_TRACK_LABELS,
  SUBJECT_ICONS,
  SUBJECT_NAMES,
  WEEKDAYS,
  trackRequiresLevel,
  type ClassTrack,
} from "@/src/constants/domain";
import type { GradeWeights } from "@/src/constants/grades";
import { MODE_LABELS, type ClassMode } from "@/src/types/classOffer";

const STEPS = ["المادة والنوع", "الجدول والمعلمة", "توزيع الدرجات"];

const TRACK_CHOICES: Array<{ id: ClassTrack; label: string; description: string; icon: "sprout-outline" | "book-open-page-variant-outline" | "certificate-outline" }> = [
  { id: "preparatory", label: "تمهيدي", description: "لمستوى من تمهيدي أول إلى سادس", icon: "sprout-outline" },
  { id: "mutor", label: "مطور", description: "لمستوى من مطور أول إلى ثامن", icon: "book-open-page-variant-outline" },
  { id: "courses", label: "دورة", description: "دورة علمية عامة لا ترتبط بمستوى", icon: "certificate-outline" },
];

const MODE_CHOICES: Array<{ id: ClassMode; label: string; icon: "map-marker-outline" | "video-outline" }> = [
  { id: "in_person", label: MODE_LABELS.in_person, icon: "map-marker-outline" },
  { id: "online", label: MODE_LABELS.online, icon: "video-outline" },
];

type Form = {
  track: ClassTrack | null;
  levelId: string | null;
  subjectIndex: number | null;
  courseName: string;
  mode: ClassMode;
  weekday: number | null;
  startTime: string;
  endTime: string;
  teacherName: string;
  weights: GradeWeights;
};

type Errors = Partial<Record<"track" | "levelId" | "subject" | "weekday" | "startTime" | "endTime" | "teacherName" | "weights", string>>;

function paramString(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export default function AddClassScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";
  const params = useLocalSearchParams<{ levelId?: string; track?: string; subjectName?: string; subjectIndex?: string }>();
  const paramLevelId = paramString(params.levelId);
  const paramTrack = paramString(params.track);
  const paramSubjectIndex = Number.parseInt(paramString(params.subjectIndex) ?? "", 10);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [weightsTouched, setWeightsTouched] = useState(false);
  const [form, setForm] = useState<Form>(() => ({
    track: paramTrack === "courses" ? "courses" : null,
    levelId: paramLevelId,
    subjectIndex: paramSubjectIndex >= 0 && paramSubjectIndex < SUBJECT_NAMES.length ? paramSubjectIndex : null,
    courseName: paramTrack === "courses" ? paramString(params.subjectName) ?? "" : "",
    mode: "in_person",
    weekday: null,
    startTime: "16:00",
    endTime: "17:00",
    teacherName: "",
    weights: { ...DEFAULT_WEIGHTS },
  }));

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const clearError = (key: keyof Errors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });
  const coursesQuery = useQuery({
    queryKey: coursesQueryKeys.list(),
    queryFn: listCourses,
    enabled: form.track === "courses",
  });
  const centerWeightsQuery = useQuery({
    queryKey: settingsQueryKeys.gradeWeights,
    queryFn: fetchGradeWeights,
  });
  const levelOffersQuery = useQuery({
    queryKey: classOffersQueryKeys.list({ levelId: form.levelId ?? "" }),
    queryFn: () => listClassOffers({ levelId: form.levelId ?? "" }),
    enabled: !!form.levelId && trackRequiresLevel(form.track),
  });

  // المستوى القادم من صفحة المستوى يحدّد المسار تلقائياً
  useEffect(() => {
    if (!paramLevelId || !levelsQuery.data) return;
    const level = levelsQuery.data.find((l) => l.id === paramLevelId);
    if (!level) return;
    setForm((prev) => (prev.track ? prev : { ...prev, track: level.track, levelId: level.id }));
  }, [paramLevelId, levelsQuery.data]);

  // أوزان المركز الافتراضية (نفس حدود رصد الدرجات) ما لم تعدّلها المشرفة
  useEffect(() => {
    if (!weightsTouched && centerWeightsQuery.data) set("weights", { ...centerWeightsQuery.data });
  }, [centerWeightsQuery.data, weightsTouched]);

  const levelOptions = useMemo(
    () =>
      trackRequiresLevel(form.track)
        ? levelsOfTrack(levelsQuery.data ?? [], form.track).map((l) => ({
            id: l.id,
            label: l.shortName || l.fullName,
            description: l.fullName,
          }))
        : [],
    [levelsQuery.data, form.track]
  );
  const selectedLevel = (levelsQuery.data ?? []).find((l) => l.id === form.levelId) ?? null;
  const subjectName =
    form.track === "courses" ? form.courseName.trim() : form.subjectIndex != null ? SUBJECT_NAMES[form.subjectIndex] : "";
  const weightsTotal = sumWeights(form.weights);
  const timesValid = isValidTime(form.startTime) && isValidTime(form.endTime);
  const duration = timesValid ? durationLabel(form.startTime, form.endTime) : null;

  const sameDayOffers = useMemo(
    () =>
      form.weekday == null
        ? []
        : (levelOffersQuery.data ?? [])
            .filter((o) => o.weekday === form.weekday)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [levelOffersQuery.data, form.weekday]
  );
  const clash = timesValid
    ? sameDayOffers.find(
        (o) => minutesOf(o.startTime) < minutesOf(form.endTime) && minutesOf(o.endTime) > minutesOf(form.startTime)
      )
    : undefined;

  const mutation = useMutation({
    mutationFn: () =>
      createClassOffer({
        track: form.track!,
        levelId: trackRequiresLevel(form.track) ? form.levelId : null,
        subjectName,
        subjectIndex: form.subjectIndex ?? undefined,
        mode: form.mode,
        weekday: form.weekday!,
        startTime: normalizeTime(form.startTime),
        endTime: normalizeTime(form.endTime),
        teacherName: form.teacherName.trim(),
        gradeWeights: form.weights,
      }),
    onSuccess: (offer) => {
      void queryClient.invalidateQueries({ queryKey: classOffersQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
      toast.success(`أُضيف فصل «${offer.subjectName}» — يتكرر كل ${WEEKDAYS[offer.weekday]}`);
      if (offer.levelId && offer.levelId !== paramLevelId) {
        router.replace(`/main/level/${offer.levelId}` as Href);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace((offer.levelId ? `/main/level/${offer.levelId}` : "/main/classes") as Href);
      }
    },
  });
  const isClashError = mutation.isError && /يتعارض/.test((mutation.error as Error).message);

  const validateStep = (index: number): Errors => {
    const e: Errors = {};
    if (index === 0) {
      if (!form.track) e.track = "اختاري نوع الفصل";
      if (trackRequiresLevel(form.track) && !form.levelId) e.levelId = "اختاري المستوى";
      if (form.track === "courses" && form.courseName.trim().length < 2) e.subject = "اكتبي اسم الدورة";
      if (trackRequiresLevel(form.track) && form.subjectIndex == null) e.subject = "اختاري المادة";
    }
    if (index === 1) {
      if (form.weekday == null) e.weekday = "اختاري يوم الفصل";
      if (!isValidTime(form.startTime)) e.startTime = "وقت غير صالح — مثل 16:00";
      if (!isValidTime(form.endTime)) e.endTime = "وقت غير صالح — مثل 17:00";
      else if (isValidTime(form.startTime) && minutesOf(form.endTime) <= minutesOf(form.startTime))
        e.endTime = "وقت النهاية يجب أن يكون بعد البداية";
      if (form.teacherName.trim().length < 2) e.teacherName = "اكتبي اسم المعلمة";
    }
    if (index === 2) {
      if (weightsTotal !== 100) e.weights = `مجموع الأوزان ${weightsTotal} — يجب أن يساوي 100`;
      else if (WEIGHT_FIELDS.some((f) => form.weights[f.key] < 1)) e.weights = "كل بند يحتاج درجة واحدة على الأقل";
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

  const chooseTrack = (track: ClassTrack) => {
    setForm((prev) => {
      const prevLevel = (levelsQuery.data ?? []).find((l) => l.id === prev.levelId);
      // المستوى المختار يبقى فقط إن كان من نفس المسار
      return { ...prev, track, levelId: prevLevel?.track === track ? prev.levelId : null };
    });
    setErrors({});
  };

  const updateWeight = (key: keyof GradeWeights, text: string) => {
    setWeightsTouched(true);
    setForm((prev) => ({ ...prev, weights: { ...prev.weights, [key]: parseScore(text, 100) } }));
    clearError("weights");
  };

  return (
    <Screen
      scrollKey={step}
      header={<Header title="فصل جديد" onBack={back} />}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button variant="secondary" onPress={() => setStep(step - 1)} disabled={mutation.isPending} style={styles.footerBack}>
              السابق
            </Button>
          ) : null}
          <Button
            size="lg"
            onPress={next}
            loading={mutation.isPending}
            icon={step === STEPS.length - 1 ? "check" : undefined}
            style={styles.flex}
          >
            {step === STEPS.length - 1 ? "إنشاء الفصل" : "التالي"}
          </Button>
        </View>
      }
    >
      <Steps steps={STEPS} current={step} />

      <View style={styles.form}>
        {step === 0 ? (
          <>
            <ChoiceCards
              label="نوع الفصل"
              required
              options={TRACK_CHOICES}
              value={form.track}
              onChange={chooseTrack}
              error={errors.track}
            />

            {trackRequiresLevel(form.track) ? (
              <>
                <SelectField
                  label={`مستوى ال${CLASS_TRACK_LABELS[form.track]}`}
                  required
                  options={levelOptions}
                  value={form.levelId}
                  onChange={(id) => {
                    set("levelId", id);
                    clearError("levelId");
                  }}
                  placeholder={levelsQuery.isLoading ? "جاري تحميل المستويات…" : "اختاري المستوى"}
                  disabled={levelsQuery.isLoading}
                  emptyText={`لا توجد مستويات ${CLASS_TRACK_LABELS[form.track]} — أضيفيها من تبويب المستويات`}
                  error={errors.levelId ?? (levelsQuery.isError ? (levelsQuery.error as Error).message : null)}
                />
                <ChoiceChips
                  label="المادة"
                  required
                  options={SUBJECT_NAMES.map((name, i) => ({ id: String(i), label: name, icon: SUBJECT_ICONS[i] }))}
                  value={form.subjectIndex == null ? null : String(form.subjectIndex)}
                  onChange={(id: string) => {
                    set("subjectIndex", Number(id));
                    clearError("subject");
                  }}
                  error={errors.subject}
                />
              </>
            ) : null}

            {form.track === "courses" ? (
              <>
                <TextField
                  label="اسم الدورة"
                  required
                  value={form.courseName}
                  onChangeText={(v) => {
                    set("courseName", v);
                    clearError("subject");
                  }}
                  placeholder="مثال: أعمال القلوب"
                  maxLength={80}
                  error={errors.subject}
                />
                {(coursesQuery.data ?? []).length ? (
                  <ChoiceChips
                    label="أو اختاري من دورات المركز"
                    options={(coursesQuery.data ?? []).map((c) => ({ id: c.name, label: c.name }))}
                    value={form.courseName.trim() || null}
                    onChange={(name: string) => {
                      set("courseName", name);
                      clearError("subject");
                    }}
                  />
                ) : null}
              </>
            ) : null}

            {form.track ? (
              <ChoiceChips
                label="طريقة الحضور"
                required
                options={MODE_CHOICES}
                value={form.mode}
                onChange={(mode: ClassMode) => set("mode", mode)}
              />
            ) : null}

            {form.mode === "online" ? (
              <Banner tone="info" title="فصل أونلاين">
                بعد الإنشاء أضيفي رابط Zoom من صفحة الحصة ليظهر زر الانضمام للطالبات.
              </Banner>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <ChoiceChips
              label="يوم الفصل الأسبوعي"
              required
              options={WEEKDAYS.map((day, i) => ({ id: String(i), label: day }))}
              value={form.weekday == null ? null : String(form.weekday)}
              onChange={(id: string) => {
                set("weekday", Number(id));
                clearError("weekday");
              }}
              error={errors.weekday}
            />

            <View style={styles.row}>
              <View style={styles.flex}>
                <TimeField
                  label="من"
                  value={form.startTime}
                  onChange={(v) => {
                    set("startTime", v);
                    clearError("startTime");
                  }}
                  error={errors.startTime}
                />
              </View>
              <View style={styles.flex}>
                <TimeField
                  label="إلى"
                  value={form.endTime}
                  onChange={(v) => {
                    set("endTime", v);
                    clearError("endTime");
                  }}
                  error={errors.endTime}
                />
              </View>
            </View>
            {duration ? (
              <Text variant="caption" color="textSecondary">
                {`مدة الحصة: ${duration}`}
              </Text>
            ) : null}

            {form.weekday != null && selectedLevel ? (
              <Card padding={3} tone={clash ? "warning" : "surface"}>
                <Text variant="label" color={clash ? "warning" : "textSecondary"}>
                  {`فصول ${selectedLevel.shortName} يوم ${WEEKDAYS[form.weekday]}`}
                </Text>
                {levelOffersQuery.isLoading ? (
                  <Text variant="caption" color="textMuted">
                    جاري التحقق من الجدول…
                  </Text>
                ) : sameDayOffers.length === 0 ? (
                  <Text variant="caption" color="textMuted">
                    اليوم متاح — لا فصول أخرى لهذا المستوى
                  </Text>
                ) : (
                  sameDayOffers.map((o) => (
                    <Text
                      key={o.id}
                      variant="caption"
                      color={clash?.id === o.id ? "warning" : "textSecondary"}
                      tabular
                    >
                      {`• ${o.subjectName} — ${timeRangeLabel(o.startTime, o.endTime)} — ${o.teacherName}`}
                    </Text>
                  ))
                )}
                {clash ? (
                  <Text variant="caption" weight="semibold" color="warning" style={styles.clashNote}>
                    {`الوقت المختار يتداخل مع «${clash.subjectName}» — غيّري الوقت أو اليوم`}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            <TextField
              label="اسم المعلمة"
              required
              icon="account-tie-outline"
              value={form.teacherName}
              onChangeText={(v) => {
                set("teacherName", v);
                clearError("teacherName");
              }}
              placeholder="مثال: أ. نورة العتيبي"
              maxLength={60}
              error={errors.teacherName}
              returnKeyType="done"
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            {mutation.isError ? (
              <Banner
                tone="danger"
                title={isClashError ? "تعارض في الجدول" : "تعذّر إنشاء الفصل"}
                action={
                  isClashError ? (
                    <Button variant="dangerTonal" size="sm" onPress={() => setStep(1)} style={styles.bannerAction}>
                      تعديل الموعد
                    </Button>
                  ) : undefined
                }
              >
                {(mutation.error as Error).message}
              </Banner>
            ) : null}

            <View style={styles.group}>
              <View style={styles.weightsHeader}>
                <Text variant="label">
                  توزيع درجات المادة
                  <Text variant="label" color="danger">
                    {" *"}
                  </Text>
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="restore"
                  onPress={() => {
                    setWeightsTouched(false);
                    set("weights", { ...(centerWeightsQuery.data ?? DEFAULT_WEIGHTS) });
                    clearError("weights");
                  }}
                >
                  الافتراضي
                </Button>
              </View>
              <View style={styles.weightsGrid}>
                {WEIGHT_FIELDS.map((field) => (
                  <View key={field.key} style={styles.weightCell}>
                    <TextField
                      label={field.label}
                      icon={field.icon}
                      value={String(form.weights[field.key])}
                      onChangeText={(text) => updateWeight(field.key, text)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      ltr
                      maxLength={3}
                    />
                  </View>
                ))}
              </View>
              <WeightsTotal total={weightsTotal} />
              {errors.weights ? (
                <Text variant="caption" color="danger">
                  {errors.weights}
                </Text>
              ) : null}
            </View>

            <Card>
              <Text variant="headline" style={styles.summaryTitle}>
                ملخص الفصل
              </Text>
              <InfoRow label="النوع" value={form.track ? CLASS_TRACK_LABELS[form.track] : null} />
              <InfoRow
                label="المستوى"
                value={form.track === "courses" ? "عام — لا يرتبط بمستوى" : selectedLevel?.shortName ?? null}
              />
              <InfoRow label="المادة" value={subjectName} />
              <InfoRow label="طريقة الحضور" value={MODE_LABELS[form.mode]} />
              <InfoRow
                label="الموعد"
                value={
                  form.weekday != null && timesValid
                    ? `كل ${WEEKDAYS[form.weekday]} · ${timeRangeLabel(normalizeTime(form.startTime), normalizeTime(form.endTime))}`
                    : null
                }
              />
              <InfoRow label="المعلمة" value={form.teacherName.trim()} last />
            </Card>
            <Text variant="caption" color="textMuted">
              تُولَّد حصص هذا الفصل في الجدول تلقائياً كل أسبوع، ويمكن تسجيل اعتذار المعلمة لأي حصة من صفحتها.
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function WeightsTotal({ total }: { total: number }) {
  const ok = total === 100;
  const over = total > 100;
  const tint = ok ? colors.success : over ? colors.danger : colors.warning;
  return (
    <View
      style={styles.totalWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`مجموع الأوزان ${total} من 100`}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(total, 100) }}
    >
      <View style={styles.totalRow}>
        <Text variant="bodyStrong" style={{ color: tint }}>
          {ok ? "المجموع مكتمل" : over ? `زيادة ${total - 100}` : `متبقٍ ${100 - total}`}
        </Text>
        <Text variant="headline" tabular style={{ color: tint }}>
          {`${total} / 100`}
        </Text>
      </View>
      <View style={styles.totalTrack}>
        <View style={[styles.totalFill, { width: `${Math.min(total, 100)}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: space[5], marginTop: space[5] },
  footer: { flexDirection: "row", gap: space[3] },
  footerBack: { minWidth: 100 },
  row: { flexDirection: "row", gap: space[3] },
  group: { gap: space[3] },
  clashNote: { marginTop: space[1] },
  bannerAction: { alignSelf: "flex-start", marginTop: space[2] },
  weightsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weightsGrid: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  weightCell: { flexBasis: "46%", flexGrow: 1 },
  totalWrap: { gap: space[2] },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: "hidden" },
  totalFill: { height: "100%", borderRadius: radius.pill },
  summaryTitle: { marginBottom: space[1] },
});
