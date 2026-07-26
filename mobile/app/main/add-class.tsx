import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  I18nManager,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addClassTheme, spacing } from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import {
  classOffersQueryKeys,
  createClassOffer,
  filterMutorLevels,
  isMutorLevel,
} from "@/src/api/classOffers";
import { GRADE_WEIGHTS, type GradeWeights } from "@/src/constants/grades";
import SelectField from "@/src/components/SelectField";
import {
  MODE_LABELS,
  TRACK_LABELS,
  type ClassMode,
  type ClassTrack,
} from "@/src/types/classOffer";
import { sessionsQueryKeys } from "@/src/api/sessions";
const STEP_NAMES = ["المادة والنوع", "الجدول والمعلمة", "توزيع الدرجات"] as const;

const CLASS_TYPES: Array<{ id: ClassTrack; label: string }> = [
  { id: "mutor", label: TRACK_LABELS.mutor },
  { id: "courses", label: TRACK_LABELS.courses },
];

const WEEK_DAYS = [
  { id: "0", label: "الأحد" },
  { id: "1", label: "الإثنين" },
  { id: "2", label: "الثلاثاء" },
  { id: "3", label: "الأربعاء" },
  { id: "4", label: "الخميس" },
  { id: "5", label: "الجمعة" },
  { id: "6", label: "السبت" },
] as const;

const SESSION_MODES: Array<{ id: ClassMode; label: string }> = [
  { id: "in_person", label: MODE_LABELS.in_person },
  { id: "online", label: MODE_LABELS.online },
];

const WEIGHT_FIELDS: Array<{ key: keyof GradeWeights; label: string }> = [
  { key: "attendance", label: "الحضور" },
  { key: "shortExam", label: "اختبار قصير" },
  { key: "participation", label: "المشاركة" },
  { key: "final", label: "النهائي" },
];

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[summaryRowStyles.row, last && summaryRowStyles.rowLast]}>
      <View style={summaryRowStyles.textWrap}>
        <Text style={summaryRowStyles.label}>{label}</Text>
        <Text style={summaryRowStyles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const summaryRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: addClassTheme.cardBorder,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textWrap: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: addClassTheme.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: addClassTheme.text,
  },
});

function parseTimeHHMM(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export default function AddClassScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id;
  const params = useLocalSearchParams<{ levelId?: string }>();
  const preselectedLevelId =
    typeof params.levelId === "string" ? params.levelId : null;

  const [step, setStep] = useState(1);
  const [subjectName, setSubjectName] = useState("");
  const [classTypeId, setClassTypeId] = useState<ClassTrack | null>(
    preselectedLevelId ? "mutor" : null
  );
  const [mode, setMode] = useState<ClassMode>("in_person");
  const [levelId, setLevelId] = useState<string | null>(preselectedLevelId);
  const [weekdayId, setWeekdayId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [teacherName, setTeacherName] = useState("");
  const [weights, setWeights] = useState<GradeWeights>({ ...GRADE_WEIGHTS });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId ?? ""),
    queryFn: () => fetchLevelsByCenter(centerId!),
    enabled: Boolean(centerId),
  });

  const createMutation = useMutation({
    mutationFn: createClassOffer,
    onSuccess: (offer) => {
      queryClient.invalidateQueries({ queryKey: classOffersQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
      setCreatedSessionId(offer.nextSessionId);
      setShowSuccessModal(true);
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const mutorLevels = useMemo(
    () => filterMutorLevels(levelsQuery.data ?? []),
    [levelsQuery.data]
  );

  const levelOptions = useMemo(
    () =>
      mutorLevels.map((level) => ({
        id: level.id,
        label: level.shortName || level.fullName,
      })),
    [mutorLevels]
  );

  useEffect(() => {
    if (!levelsQuery.data || !levelId) return;
    const level = levelsQuery.data.find((item) => item.id === levelId);
    if (!level || !isMutorLevel(level)) {
      setLevelId(null);
    }
  }, [levelsQuery.data, levelId]);

  const selectedLevel = useMemo(
    () => mutorLevels.find((level) => level.id === levelId) ?? null,
    [mutorLevels, levelId]
  );

  const selectedClassType = CLASS_TYPES.find((item) => item.id === classTypeId);
  const selectedWeekday = WEEK_DAYS.find((item) => item.id === weekdayId);
  const isMutorTrack = classTypeId === "mutor";
  const isCourseTrack = classTypeId === "courses";

  const weightsTotal =
    weights.attendance + weights.shortExam + weights.participation + weights.final;

  const canProceedStep1 =
    subjectName.trim().length > 0 &&
    Boolean(classTypeId) &&
    (isCourseTrack || Boolean(levelId));

  const canProceedStep2 =
    Boolean(weekdayId) &&
    parseTimeHHMM(startTime) &&
    parseTimeHHMM(endTime) &&
    teacherName.trim().length > 0;

  const handleSelectClassType = (nextType: ClassTrack) => {
    setClassTypeId(nextType);
    if (nextType === "courses") {
      setLevelId(null);
      return;
    }
    if (preselectedLevelId) {
      const level = (levelsQuery.data ?? []).find(
        (item) => item.id === preselectedLevelId
      );
      if (level && isMutorLevel(level)) {
        setLevelId(preselectedLevelId);
      }
    }
  };

  const handleClose = () => router.back();
  const handleBack = () => {
    if (step === 1) router.back();
    else setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handleNext = () => {
    if (step === 1 && !canProceedStep1) {
      Alert.alert(
        "تنبيه",
        isMutorTrack
          ? "أكملي اسم المادة ونوع المطور ومستوى المطور (١–٨)"
          : "أكملي اسم المادة ونوع الفصل"
      );
      return;
    }
    if (step === 2 && !canProceedStep2) {
      Alert.alert("تنبيه", "أكملي اليوم والوقت واسم المعلمة بصيغة 10:00");
      return;
    }
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const handleCreate = () => {
    if (!canProceedStep1 || !canProceedStep2 || !selectedWeekday || !classTypeId) {
      Alert.alert("تنبيه", "أكملي جميع الحقول أولاً");
      return;
    }
    if (classTypeId === "mutor" && !levelId) {
      Alert.alert("تنبيه", "فصل المطور يتطلب اختيار مستوى مطور (١–٨)");
      return;
    }
    if (weightsTotal !== 100) {
      Alert.alert("تنبيه", "مجموع أوزان الدرجات يجب أن يساوي 100");
      return;
    }
    if (!parseTimeHHMM(startTime) || !parseTimeHHMM(endTime)) {
      Alert.alert("تنبيه", "صيغة الوقت غير صالحة — استخدمي مثل 10:00");
      return;
    }

    createMutation.mutate({
      track: classTypeId,
      levelId: classTypeId === "courses" ? null : levelId,
      subjectName: subjectName.trim(),
      mode,
      weekday: Number(selectedWeekday.id),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      teacherName: teacherName.trim(),
      gradeWeights: { ...weights },
    });
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    if (classTypeId === "mutor" && levelId) {
      router.replace(`/main/level/${levelId}` as Href);
      return;
    }
    router.replace("/main/classes" as Href);
  };

  const handleOpenDraftSession = () => {
    setShowSuccessModal(false);
    if (createdSessionId) {
      router.replace(`/main/session/${createdSessionId}` as Href);
      return;
    }
    handleCloseSuccess();
  };

  const updateWeight = (key: keyof GradeWeights, raw: string) => {
    const n = Number(raw.replace(/[^\d]/g, ""));
    if (!Number.isFinite(n)) return;
    setWeights((prev) => ({ ...prev, [key]: Math.min(100, Math.max(0, n)) }));
  };

  const isSaving = createMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="رجوع"
        >
          <Text style={styles.headerBackIcon}>
            {I18nManager.isRTL ? "→" : "←"}
          </Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>إضافة فصل جديد</Text>
          <Text style={styles.headerSubtitle}>
            الخطوة {step} من 3 — {STEP_NAMES[step - 1]}
          </Text>
          <View style={styles.progressBar}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < step && styles.progressSegmentCompleted,
                  i === step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          style={styles.headerButton}
          onPress={handleClose}
          accessibilityLabel="إغلاق"
        >
          <Text style={styles.headerCloseIcon}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>
            يُحفظ الفصل على الخادم ويُنشأ أول موعد حصة قادم تلقائياً. رابط Zoom لاحقاً.
          </Text>
        </View>

        {step === 1 ? (
          <>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionBlueLine} />
              <Text style={styles.sectionTitle}>
                {isMutorTrack ? "المادة ومستوى المطور" : "المادة ونوع الفصل"}
              </Text>
            </View>
            <View style={styles.formCard}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>اسم المادة *</Text>
                <TextInput
                  style={styles.formInput}
                  value={subjectName}
                  onChangeText={setSubjectName}
                  placeholder="مثال: السيرة"
                  placeholderTextColor={addClassTheme.textSecondary}
                  accessibilityLabel="اسم المادة"
                />
              </View>
              <View style={styles.formDivider} />
              <Text style={styles.formLabel}>نوع الفصل *</Text>
              <View style={styles.chipRow}>
                {CLASS_TYPES.map((option) => {
                  const selected = classTypeId === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => handleSelectClassType(option.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.formDivider} />
              <Text style={styles.formLabel}>حضوري أو أونلاين *</Text>
              <View style={styles.chipRow}>
                {SESSION_MODES.map((option) => {
                  const selected = mode === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setMode(option.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {isMutorTrack ? (
              levelsQuery.isLoading ? (
                <ActivityIndicator
                  color={addClassTheme.accentBlue}
                  style={{ marginTop: spacing.lg }}
                />
              ) : (
                <View style={{ marginTop: spacing.md }}>
                  <SelectField
                    label="مستوى المطور"
                    required
                    value={levelId}
                    options={levelOptions}
                    onSelect={setLevelId}
                    placeholder={
                      levelOptions.length > 0
                        ? "اختر مطور ١ … مطور ٨"
                        : "لا توجد مستويات مطور"
                    }
                    disabled={levelOptions.length === 0}
                    accessibilityLabel="مستوى المطور"
                  />
                </View>
              )
            ) : null}

            {isCourseTrack ? (
              <Text style={styles.hint}>
                فصل الدورة عام لجميع المستويات ولا يتطلب اختيار مستوى مطور.
              </Text>
            ) : (
              <Text style={styles.hint}>
                المطور سلّم مستويات من مطور ١ إلى مطور ٨. الفصل يرتبط بمطور معيّن.
                الدورة فصل عام بلا مستوى. الحصة موعد واحد لاحقاً. Zoom من تفاصيل الحصة لاحقاً.
              </Text>
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionBlueLine, styles.sectionPurpleLine]} />
              <Text style={styles.sectionTitle}>الجدول والمعلمة</Text>
            </View>
            <View style={styles.formCard}>
              <SelectField
                label="اليوم الأسبوعي"
                required
                value={weekdayId}
                options={WEEK_DAYS.map((d) => ({ id: d.id, label: d.label }))}
                onSelect={setWeekdayId}
                placeholder="اختر اليوم"
                accessibilityLabel="يوم الفصل الأسبوعي"
              />
              <View style={styles.formDivider} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>وقت البداية *</Text>
                <TextInput
                  style={styles.formInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="10:00"
                  placeholderTextColor={addClassTheme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="وقت البداية"
                />
              </View>
              <View style={styles.formDivider} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>وقت النهاية *</Text>
                <TextInput
                  style={styles.formInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="11:00"
                  placeholderTextColor={addClassTheme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="وقت النهاية"
                />
              </View>
              <View style={styles.formDivider} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>اسم المعلمة *</Text>
                <TextInput
                  style={styles.formInput}
                  value={teacherName}
                  onChangeText={setTeacherName}
                  placeholder="مثال: أ. نورة"
                  placeholderTextColor={addClassTheme.textSecondary}
                  accessibilityLabel="اسم المعلمة"
                />
              </View>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionBlueLine} />
              <Text style={styles.sectionTitle}>توزيع الدرجات</Text>
            </View>
            <View style={styles.formCard}>
              {WEIGHT_FIELDS.map((field, index) => (
                <View key={field.key}>
                  {index > 0 ? <View style={styles.formDivider} /> : null}
                  <View style={styles.weightRow}>
                    <TextInput
                      style={styles.weightInput}
                      value={String(weights[field.key])}
                      onChangeText={(text) => updateWeight(field.key, text)}
                      keyboardType="number-pad"
                      accessibilityLabel={field.label}
                    />
                    <Text style={styles.formLabel}>{field.label}</Text>
                  </View>
                </View>
              ))}
              <Text
                style={[
                  styles.totalText,
                  weightsTotal === 100 ? styles.totalOk : styles.totalBad,
                ]}
              >
                المجموع: {weightsTotal} / 100
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>ملخص الفصل</Text>
              <SummaryRow label="المادة" value={subjectName.trim()} />
              <SummaryRow label="النوع" value={selectedClassType?.label ?? "—"} />
              <SummaryRow label="الوضع" value={MODE_LABELS[mode]} />
              <SummaryRow
                label="المستوى"
                value={
                  isCourseTrack
                    ? "عام لجميع المستويات"
                    : selectedLevel?.shortName || selectedLevel?.fullName || "—"
                }
              />
              <SummaryRow label="اليوم" value={selectedWeekday?.label ?? "—"} />
              <SummaryRow label="الوقت" value={`${startTime} – ${endTime}`} />
              <SummaryRow label="المعلمة" value={teacherName.trim()} last />
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          {step < 3 ? (
            <View style={styles.footerTwoButtons}>
              {step > 1 ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setStep((s) => (s - 1) as 1 | 2)}
                >
                  <Text style={styles.secondaryButtonText}>السابق</Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.primaryButtonFlex,
                  ((step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)) &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={
                  (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
                }
              >
                <Text style={styles.primaryButtonText}>التالي</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.footerTwoButtons}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep(2)}
                disabled={isSaving}
              >
                <Text style={styles.secondaryButtonText}>السابق</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.primaryButtonFlex,
                  (isSaving || weightsTotal !== 100) && styles.primaryButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={isSaving || weightsTotal !== 100}
              >
                {isSaving ? (
                  <ActivityIndicator color={addClassTheme.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>إنشاء الفصل</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={handleCloseSuccess}>
          <Pressable style={styles.successModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.successIconWrap}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>تم إنشاء الفصل</Text>
            <Text style={styles.successMessage}>
              حُفظ الفصل على الخادم مع أول حصة مجدولة. يمكنك فتح تفاصيل الحصة الآن.
            </Text>
            <Pressable style={styles.successButton} onPress={handleOpenDraftSession}>
              <Text style={styles.successButtonText}>فتح تفاصيل الحصة</Text>
            </Pressable>
            <Pressable
              style={[styles.successButton, styles.successSecondary]}
              onPress={handleCloseSuccess}
            >
              <Text style={styles.successSecondaryText}>
                {classTypeId === "mutor" && levelId
                  ? "العودة للمستوى"
                  : "العودة للمستويات"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: addClassTheme.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: addClassTheme.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: addClassTheme.headerButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: addClassTheme.accentBlue,
  },
  headerCloseIcon: {
    fontSize: 18,
    fontWeight: "500",
    color: addClassTheme.text,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: addClassTheme.textSecondary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
  },
  progressSegment: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: addClassTheme.progressInactive,
  },
  progressSegmentCompleted: {
    backgroundColor: addClassTheme.progressCompleted,
  },
  progressSegmentActive: {
    backgroundColor: addClassTheme.progressActive,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  previewBanner: {
    backgroundColor: addClassTheme.infoBanner,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: addClassTheme.selectedBorder,
  },
  previewBannerText: {
    fontSize: 13,
    lineHeight: 20,
    color: addClassTheme.text,
    textAlign: "right",
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionBlueLine: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: addClassTheme.accentBlue,
    marginLeft: spacing.sm,
  },
  sectionPurpleLine: {
    backgroundColor: addClassTheme.accentPurple,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: addClassTheme.text,
  },
  formCard: {
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    gap: spacing.sm,
  },
  formField: { gap: spacing.xs },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: addClassTheme.text,
    textAlign: "right",
  },
  formInput: {
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: addClassTheme.text,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  formDivider: {
    height: 1,
    backgroundColor: addClassTheme.cardBorder,
    marginVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  chip: {
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: addClassTheme.background,
  },
  chipSelected: {
    borderColor: addClassTheme.selectedBorder,
    backgroundColor: addClassTheme.selectedBg,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: addClassTheme.text,
  },
  chipTextSelected: {
    color: addClassTheme.accentBlue,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: addClassTheme.textSecondary,
    lineHeight: 20,
    textAlign: "right",
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  weightInput: {
    width: 72,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: "700",
    color: addClassTheme.accentBlue,
    textAlign: "center",
  },
  totalText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  totalOk: { color: "#166534" },
  totalBad: { color: "#b91c1c" },
  summaryCard: {
    marginTop: spacing.lg,
    backgroundColor: addClassTheme.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: spacing.sm,
  },
  footer: { marginTop: spacing.xl },
  footerTwoButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: addClassTheme.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: addClassTheme.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
    backgroundColor: addClassTheme.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: addClassTheme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  successModal: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: addClassTheme.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: addClassTheme.selectedBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  successIcon: {
    fontSize: 32,
    fontWeight: "700",
    color: addClassTheme.selectedBorder,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: addClassTheme.text,
    marginBottom: spacing.xs,
  },
  successMessage: {
    fontSize: 15,
    color: addClassTheme.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  successButton: {
    backgroundColor: addClassTheme.primaryDark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  successButtonText: {
    color: addClassTheme.white,
    fontSize: 16,
    fontWeight: "700",
  },
  successSecondary: {
    backgroundColor: addClassTheme.white,
    borderWidth: 1,
    borderColor: addClassTheme.cardBorder,
  },
  successSecondaryText: {
    color: addClassTheme.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
