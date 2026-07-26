import { useEffect } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import { SUBJECT_NAMES } from "@/src/constants/subjects";
import {
  fetchLevelById,
  fetchLevelStudents,
  levelQueryKeys,
} from "@/src/api/levels";
import {
  classOffersQueryKeys,
  listClassOffers,
} from "@/src/api/classOffers";
import { goBack } from "@/src/utils/navigation";
import type { StudentListItem, StudentStatus } from "@/src/types/student";
import { MODE_LABELS, TRACK_LABELS } from "@/src/types/classOffer";

function isMutorLadderOrder(order: number | undefined): boolean {
  return typeof order === "number" && order >= 1 && order <= 8;
}

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const TIME_SLOTS = ["08:00", "09:30", "11:00", "12:30"];

const PILL_COLORS = [
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#e0e7ff", text: "#3730a3" },
];

function getMockSchedule(): number[][] {
  return [
    [0, 1, 2, 3],
    [4, 0, 5, -1],
    [1, 2, 6, 0],
    [3, 4, -1, 1],
    [-1, 5, 2, 4],
  ];
}

const STUDENT_STATUS = {
  regular: { label: "منتظمة", bg: centerColors.accentGreen, text: centerColors.textOnAccent },
  excellent: { label: "متفوقة", bg: centerColors.accentGreen, text: centerColors.textOnAccent },
  warning: { label: "تحذير", bg: centerColors.accentYellow, text: centerColors.text },
  frequent_absence: { label: "غياب متكرر", bg: centerColors.accentRed, text: centerColors.textOnAccent },
} as const;

const STUDENT_TABLE_HEADERS = ["#", "اسم الطالب", "الهوية المدنية", "الحضور", "الدرجة", "الحالة"];

function formatMetric(value: number | null): string {
  return value == null ? "—" : String(value);
}

function formatAttendance(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const levelId = id ?? "";
  const schedule = getMockSchedule();

  const {
    data: level,
    isLoading: levelLoading,
    isError: levelError,
    error: levelErrorObj,
  } = useQuery({
    queryKey: levelQueryKeys.detail(levelId),
    queryFn: () => fetchLevelById(levelId),
    enabled: !!levelId,
  });

  const isMutorLevel = isMutorLadderOrder(level?.order);

  useEffect(() => {
    if (!level || levelLoading) return;
    if (!isMutorLadderOrder(level.order)) {
      router.replace("/main/classes" as Href);
    }
  }, [level, levelLoading, router]);

  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: levelQueryKeys.students(levelId),
    queryFn: () => fetchLevelStudents(levelId),
    enabled: !!levelId && isMutorLevel,
  });

  const {
    data: mutorClassOffers = [],
    isLoading: offersLoading,
  } = useQuery({
    queryKey: classOffersQueryKeys.list({ levelId, track: "mutor" }),
    queryFn: () => listClassOffers({ levelId, track: "mutor" }),
    enabled: !!levelId && isMutorLevel,
  });

  const studentCount = level?.studentCount ?? students.length;

  if (!levelLoading && level && !isMutorLevel) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.mainContent}>
          <Text style={styles.errorText}>
            هذا ليس مستوى مطور. الدورات العلمية تُفتح من قائمة الدورات.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            { justifyContent: I18nManager.isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => goBack(router, "/main/classes" as Href)}
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.text}
            />
            <Text style={styles.backButtonText}>المستويات</Text>
          </Pressable>
        </View>

        {levelLoading ? (
          <ActivityIndicator size="large" color={centerColors.accent} style={styles.loader} />
        ) : levelError ? (
          <Text style={styles.errorText}>
            {levelErrorObj instanceof Error ? levelErrorObj.message : "تعذر تحميل المستوى"}
          </Text>
        ) : (
          <>
            <Text style={styles.levelTitle}>{level?.fullName ?? "—"}</Text>
            <Text style={styles.levelSubtitle}>{studentCount} طالب مسجل</Text>
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>الفصول</Text>
            <Pressable
              style={styles.addClassButton}
              onPress={() =>
                router.push(
                  `/main/add-class?levelId=${encodeURIComponent(levelId)}` as import("expo-router").Href
                )
              }
              disabled={!levelId}
              accessibilityRole="button"
              accessibilityLabel="إضافة فصل مطور"
            >
              <MaterialCommunityIcons name="plus" size={18} color={centerColors.primaryButtonText} />
              <Text style={styles.addClassButtonText}>إضافة فصل مطور</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionHint}>
            فصول المطور المرتبطة بهذا المستوى. اضغطي البطاقة لفتح تفاصيل الحصة القادمة.
          </Text>
          {offersLoading ? (
            <ActivityIndicator size="small" color={centerColors.accent} />
          ) : mutorClassOffers.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد فصول مطور لهذا المستوى بعد</Text>
          ) : (
            <View style={styles.classList}>
              {mutorClassOffers.map((offer) => (
                <Pressable
                  key={offer.id}
                  style={styles.classCard}
                  onPress={() => {
                    if (!offer.nextSessionId) return;
                    router.push(
                      `/main/session/${offer.nextSessionId}` as import("expo-router").Href
                    );
                  }}
                >
                  <Text style={styles.classCardTitle}>{offer.subjectName}</Text>
                  <Text style={styles.classCardMeta}>
                    {TRACK_LABELS[offer.track]} · {MODE_LABELS[offer.mode]}
                  </Text>
                  <Text style={styles.classCardMeta}>
                    {offer.weekdayLabel} · {offer.startTime} – {offer.endTime}
                  </Text>
                  <Text style={styles.classCardTeacher}>{offer.teacherName}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المواد الدراسية (حضور ودرجات)</Text>
          <View style={styles.cardsGrid}>
            {SUBJECT_NAMES.map((name, i) => (
              <Pressable
                key={name}
                style={styles.subjectCard}
                onPress={() =>
                  router.push(
                    `/main/subject/${levelId}/${i}` as import("expo-router").Href
                  )
                }
                disabled={!levelId}
              >
                <Text style={styles.subjectCardName}>{name}</Text>
                <Text style={styles.subjectCardTeacher}>أ. —</Text>
                <Text style={styles.subjectCardCount}>{studentCount} طالب مسجل</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الجدول الأسبوعي (معاينة قديمة)</Text>
          <View style={styles.tableWrap}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableHeader]}>
                <Text style={styles.tableHeaderText}>الوقت</Text>
              </View>
              {DAYS.map((day) => (
                <View
                  key={day}
                  style={[styles.tableCell, styles.tableHeader, styles.tableDayCell]}
                >
                  <Text style={styles.tableHeaderText}>{day}</Text>
                </View>
              ))}
            </View>
            {TIME_SLOTS.map((time, timeIdx) => (
              <View key={time} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.timeCell]}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                {DAYS.map((_, dayIdx) => {
                  const subIdx = schedule[dayIdx][timeIdx];
                  const isEmpty = subIdx < 0;
                  const colors = isEmpty
                    ? { bg: centerColors.cardBg, text: centerColors.textSecondary }
                    : PILL_COLORS[subIdx % PILL_COLORS.length];
                  return (
                    <View
                      key={`${dayIdx}-${timeIdx}`}
                      style={[styles.tableCell, styles.tableDayCell]}
                    >
                      <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.pillText, { color: colors.text }]}>
                          {isEmpty ? "—" : SUBJECT_NAMES[subIdx]}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.studentListHeader}>
            <Text style={styles.sectionTitle}>قائمة الطلاب ({studentCount} طالب)</Text>
            <Pressable style={styles.exportButton}>
              <MaterialCommunityIcons name="microsoft-excel" size={18} color={centerColors.primaryButtonText} />
              <Text style={styles.exportButtonText}>تصدير Excel</Text>
            </Pressable>
          </View>

          {studentsLoading ? (
            <ActivityIndicator size="small" color={centerColors.accent} />
          ) : studentsError ? (
            <Text style={styles.errorText}>تعذر تحميل قائمة الطلاب</Text>
          ) : students.length === 0 ? (
            <Text style={styles.emptyText}>لا يوجد طلاب في هذا المستوى</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.studentTableScroll}
            >
              <View style={styles.studentTableWrap}>
                <View style={styles.tableRow}>
                  {STUDENT_TABLE_HEADERS.map((h) => (
                    <View
                      key={h}
                      style={[
                        styles.studentTableCell,
                        styles.studentTableHeaderCell,
                        h === "#" && styles.studentCellNum,
                        h === "الحالة" && styles.studentCellStatus,
                      ]}
                    >
                      <Text style={styles.tableHeaderText}>{h}</Text>
                    </View>
                  ))}
                </View>
                {students.map((row: StudentListItem, i: number) => {
                  const statusKey = row.status as StudentStatus;
                  const status = STUDENT_STATUS[statusKey] ?? STUDENT_STATUS.regular;
                  return (
                    <View key={row.id} style={styles.tableRow}>
                      <View style={[styles.studentTableCell, styles.studentCellNum]}>
                        <Text style={styles.studentCellText}>{i + 1}</Text>
                      </View>
                      <View style={[styles.studentTableCell, styles.studentCellName]}>
                        <Text style={styles.studentCellText} numberOfLines={1}>
                          {row.fullName}
                        </Text>
                      </View>
                      <View style={[styles.studentTableCell, styles.studentCellId]}>
                        <Text style={styles.studentCellText}>{row.idNumber}</Text>
                      </View>
                      <View style={[styles.studentTableCell, styles.studentCellAtt]}>
                        <Text style={styles.studentCellText}>
                          {formatAttendance(row.attendancePercent)}
                        </Text>
                      </View>
                      <View style={[styles.studentTableCell, styles.studentCellGrade]}>
                        <Text style={styles.studentCellText}>
                          {formatMetric(row.gradeAverage)}
                        </Text>
                      </View>
                      <View style={[styles.studentTableCell, styles.studentCellStatus]}>
                        <View style={[styles.statusPillStudent, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusPillStudentText, { color: status.text }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
  main: { flex: 1 },
  mainContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
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
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.xs,
  },
  levelSubtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginBottom: spacing.xl,
  },
  loader: { marginBottom: spacing.lg },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
  },
  section: { marginBottom: spacing.xl },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  sectionHint: {
    fontSize: 13,
    color: centerColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  addClassButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    gap: spacing.xs,
  },
  addClassButtonText: {
    color: centerColors.primaryButtonText,
    fontSize: 13,
    fontWeight: "600",
  },
  classList: { gap: spacing.sm },
  classCard: {
    backgroundColor: centerColors.cardBg,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    marginBottom: spacing.sm,
  },
  classCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 4,
  },
  classCardMeta: {
    fontSize: 13,
    color: centerColors.textSecondary,
    marginBottom: 2,
  },
  classCardTeacher: {
    fontSize: 13,
    fontWeight: "600",
    color: centerColors.accent,
    marginTop: 4,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  subjectCard: {
    width: "48%",
    minWidth: 140,
    marginHorizontal: "1%",
    marginBottom: spacing.md,
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  subjectCardName: { fontSize: 14, fontWeight: "700", color: centerColors.text, marginBottom: 4 },
  subjectCardTeacher: { fontSize: 12, color: centerColors.textSecondary, marginBottom: 2 },
  subjectCardCount: { fontSize: 12, color: centerColors.accent, fontWeight: "600" },
  tableWrap: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableRow: { flexDirection: "row" },
  tableCell: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  tableHeader: { backgroundColor: centerColors.accent },
  tableHeaderText: { color: centerColors.textOnAccent, fontSize: 12, fontWeight: "700" },
  tableDayCell: { flex: 1, minWidth: 72 },
  timeCell: { width: 56, backgroundColor: centerColors.cardBg },
  timeText: { fontSize: 12, color: centerColors.textSecondary },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 11, fontWeight: "600" },
  studentListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    gap: spacing.xs,
  },
  exportButtonText: { color: centerColors.primaryButtonText, fontSize: 13, fontWeight: "600" },
  studentTableScroll: { marginHorizontal: -spacing.lg },
  studentTableWrap: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 400,
  },
  studentTableCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  studentTableHeaderCell: { backgroundColor: centerColors.accent },
  studentCellNum: { width: 32, minWidth: 32 },
  studentCellName: { flex: 1.2, minWidth: 88 },
  studentCellId: { width: 92, minWidth: 92 },
  studentCellAtt: { width: 52, minWidth: 52 },
  studentCellGrade: { width: 44, minWidth: 44 },
  studentCellStatus: { width: 82, minWidth: 82 },
  studentCellText: { fontSize: 12, color: centerColors.text },
  statusPillStudent: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusPillStudentText: { fontSize: 10, fontWeight: "600" },
});
