import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  I18nManager,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { fetchGrades, gradesQueryKeys, saveGradesBulk } from "@/src/api/grades";
import { getSubjectName } from "@/src/constants/subjects";
import { goBack } from "@/src/utils/navigation";
import {
  GRADE_WEIGHTS,
  clampGradeValue,
  getGradeLabelInfo,
} from "@/src/constants/grades";

function parseNum(val: string, max: number): number {
  const n = parseInt(val, 10);
  return clampGradeValue(isNaN(n) ? 0 : n, max);
}

function GradeInput({
  label,
  value,
  onChange,
  max,
  fullWidth,
}: {
  label: string;
  value: number;
  onChange?: (n: number) => void;
  max: number;
  fullWidth?: boolean;
}) {
  const strVal = String(value);
  const handleChange = (text: string) => {
    onChange?.(parseNum(text, max));
  };
  const inc = () => onChange?.(clampGradeValue(value + 1, max));
  const dec = () => onChange?.(clampGradeValue(value - 1, max));

  return (
    <View style={[styles.inputGroup, fullWidth && styles.inputGroupFullWidth]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.spinnerButtons}>
          <Pressable style={styles.spinnerBtn} onPress={inc}>
            <MaterialCommunityIcons name="chevron-up" size={18} color={centerColors.text} />
          </Pressable>
          <Pressable style={styles.spinnerBtn} onPress={dec}>
            <MaterialCommunityIcons name="chevron-down" size={18} color={centerColors.text} />
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={strVal}
          onChangeText={handleChange}
          keyboardType="numeric"
          textAlign="right"
        />
      </View>
    </View>
  );
}

export default function GradesScreen() {
  const { levelId, subjectIndex } = useLocalSearchParams<{
    levelId: string;
    subjectIndex: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedLevelId = levelId ?? "";
  const subjectIdx = parseInt(subjectIndex ?? "0", 10);
  const subjectName = getSubjectName(subjectIdx);

  const [attendance, setAttendance] = useState(0);
  const [shortExam, setShortExam] = useState(0);
  const [participation, setParticipation] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [studentDropdownVisible, setStudentDropdownVisible] = useState(false);

  const { data: level, isLoading: levelLoading } = useQuery({
    queryKey: levelQueryKeys.detail(resolvedLevelId),
    queryFn: () => fetchLevelById(resolvedLevelId),
    enabled: !!resolvedLevelId,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: levelQueryKeys.students(resolvedLevelId),
    queryFn: () => fetchLevelStudents(resolvedLevelId),
    enabled: !!resolvedLevelId,
  });

  const { data: gradesSheet, isLoading: gradesLoading } = useQuery({
    queryKey: gradesQueryKeys.sheet(resolvedLevelId, subjectIdx),
    queryFn: () => fetchGrades(resolvedLevelId, subjectIdx),
    enabled: !!resolvedLevelId,
  });

  useEffect(() => {
    if (!selectedStudent || !gradesSheet) return;
    const record = gradesSheet.records.find((r) => r.studentId === selectedStudent.id);
    if (record) {
      setAttendance(record.breakdown.attendance);
      setShortExam(record.breakdown.shortExam);
      setParticipation(record.breakdown.participation);
      setFinalScore(record.breakdown.final);
    } else {
      setAttendance(0);
      setShortExam(0);
      setParticipation(0);
      setFinalScore(0);
    }
  }, [selectedStudent, gradesSheet]);

  const saveMutation = useMutation({
    mutationFn: saveGradesBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gradesQueryKeys.sheet(resolvedLevelId, subjectIdx),
      });
      Alert.alert("تم الحفظ", "تم حفظ الدرجات بنجاح", [
        {
          text: "حسناً",
          onPress: () =>
            goBack(
              router,
              `/main/subject/${resolvedLevelId}/${subjectIndex}` as import("expo-router").Href
            ),
        },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
  });

  const total = useMemo(
    () => attendance + shortExam + participation + finalScore,
    [attendance, shortExam, participation, finalScore]
  );
  const gradeInfo = useMemo(() => getGradeLabelInfo(total), [total]);

  const isLoading = levelLoading || studentsLoading || gradesLoading;

  const handleSave = () => {
    if (!selectedStudent) {
      Alert.alert("تنبيه", "اختر الطالبة أولاً");
      return;
    }

    saveMutation.mutate({
      levelId: resolvedLevelId,
      subjectIndex: subjectIdx,
      records: [
        {
          studentId: selectedStudent.id,
          breakdown: {
            attendance,
            shortExam,
            participation,
            final: finalScore,
          },
        },
      ],
    });
  };

  if (!resolvedLevelId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>معرّف المستوى غير متوفر</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { direction: I18nManager.isRTL ? "rtl" : "ltr" }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.main}>
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() =>
              goBack(
                router,
                `/main/subject/${resolvedLevelId}/${subjectIndex}` as import("expo-router").Href
              )
            }
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.text}
            />
            <Text style={styles.backButtonText}>تفاصيل المادة</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Pressable
            style={styles.exportButton}
            onPress={() => Alert.alert("تصدير", "جاري تصدير البيانات إلى Excel...")}
          >
            <MaterialCommunityIcons
              name="microsoft-excel"
              size={20}
              color={centerColors.textOnAccent}
            />
          </Pressable>
          <Pressable
            style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={centerColors.textOnAccent} />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={18} color={centerColors.textOnAccent} />
                <Text style={styles.saveButtonText}>حفظ</Text>
              </>
            )}
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={centerColors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleCenter}>
              <MaterialCommunityIcons name="notebook" size={24} color={centerColors.text} />
              <Text style={styles.headerTitle}>سجل الدرجات</Text>
            </View>
            <Text style={styles.levelSubtitle}>{level?.fullName ?? "—"}</Text>

            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.subjectName}>{subjectName}</Text>
                  </View>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.totalScore}>{total}</Text>
                    <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.bg }]}>
                      <Text style={[styles.gradeBadgeText, { color: gradeInfo.text }]}>
                        {gradeInfo.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.inputsSection}>
                  <View style={styles.dropdownSection}>
                    <Text style={styles.inputLabel}>الطالبة</Text>
                    <Pressable
                      style={styles.dropdownTrigger}
                      onPress={() => setStudentDropdownVisible(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !selectedStudent && styles.dropdownPlaceholder,
                        ]}
                      >
                        {selectedStudent?.name ?? "اختر الطالبة"}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={20}
                        color={centerColors.textSecondary}
                      />
                    </Pressable>
                    <Modal
                      visible={studentDropdownVisible}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setStudentDropdownVisible(false)}
                    >
                      <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setStudentDropdownVisible(false)}
                      >
                        <View style={styles.modalContent}>
                          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                            {students.length === 0 ? (
                              <Text style={styles.emptyText}>لا توجد طالبات في هذا المستوى</Text>
                            ) : (
                              students.map((s) => (
                                <Pressable
                                  key={s.id}
                                  style={styles.modalOption}
                                  onPress={() => {
                                    setSelectedStudent({ id: s.id, name: s.fullName });
                                    setStudentDropdownVisible(false);
                                  }}
                                >
                                  <Text style={styles.modalOptionText}>{s.fullName}</Text>
                                </Pressable>
                              ))
                            )}
                          </ScrollView>
                        </View>
                      </Pressable>
                    </Modal>
                  </View>

                  <View style={styles.inputRow2}>
                    <GradeInput
                      label="مشاركة"
                      value={participation}
                      onChange={setParticipation}
                      max={GRADE_WEIGHTS.participation}
                    />
                  </View>
                  <View style={styles.verticalInputs}>
                    <GradeInput
                      label="اختبار قصير"
                      value={shortExam}
                      onChange={setShortExam}
                      max={GRADE_WEIGHTS.shortExam}
                      fullWidth
                    />
                    <GradeInput
                      label="حضور"
                      value={attendance}
                      onChange={setAttendance}
                      max={GRADE_WEIGHTS.attendance}
                      fullWidth
                    />
                  </View>
                  <View style={styles.summaryRow}>
                    <GradeInput
                      label="نهائي"
                      value={finalScore}
                      onChange={setFinalScore}
                      max={GRADE_WEIGHTS.final}
                      fullWidth
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  main: { flex: 1, padding: spacing.lg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    color: centerColors.text,
    fontWeight: "600",
    textAlign: "right",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
    textAlign: "center",
  },
  levelSubtitle: {
    fontSize: 13,
    color: centerColors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
    minWidth: 72,
    justifyContent: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    color: centerColors.textOnAccent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  card: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  cardHeaderRight: {
    alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
  },
  cardHeaderLeft: {
    alignItems: I18nManager.isRTL ? "flex-start" : "flex-end",
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 2,
    textAlign: "right",
  },
  totalScore: {
    fontSize: 28,
    fontWeight: "700",
    color: centerColors.accent,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  gradeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  inputsSection: {
    gap: spacing.md,
  },
  dropdownSection: {
    marginBottom: spacing.sm,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    backgroundColor: centerColors.cardBg,
  },
  dropdownText: {
    fontSize: 14,
    color: centerColors.text,
    textAlign: "right",
  },
  dropdownPlaceholder: {
    color: centerColors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    padding: spacing.sm,
    maxHeight: 400,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: centerColors.cardBorder,
  },
  modalOptionText: {
    fontSize: 14,
    color: centerColors.text,
    textAlign: "right",
  },
  verticalInputs: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  summaryRow: {
    marginTop: spacing.sm,
    flexDirection: "column",
    gap: spacing.sm,
  },
  inputRow2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  inputGroup: {
    flex: 1,
    minWidth: 80,
  },
  inputGroupFullWidth: {
    flex: 0,
    minWidth: undefined,
    width: "100%",
  },
  inputLabel: {
    fontSize: 11,
    color: centerColors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 6,
    backgroundColor: centerColors.cardBg,
  },
  spinnerButtons: {
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: centerColors.cardBorder,
  },
  spinnerBtn: {
    padding: 2,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: centerColors.text,
    textAlign: "right",
  },
});
