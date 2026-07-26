import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  I18nManager,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import {
  fetchStudentById,
  promoteStudent,
  studentQueryKeys,
  updateStudentEnrollmentStatus,
} from "@/src/api/students";
import {
  fetchStudentAttendance,
  fetchStudentGrades,
  gradesQueryKeys,
} from "@/src/api/grades";
import { getSubjectName } from "@/src/constants/subjects";
import { getGradeLabelInfo } from "@/src/constants/grades";
import type { AttendanceCalendarDay } from "@/src/types/student";
import {
  ACADEMIC_LEVEL_OPTIONS,
  NATIONALITY_OPTIONS,
} from "@/src/constants/registrationOptions";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_OPTIONS,
  type EnrollmentStatus,
} from "@/src/constants/enrollment";
import { goBack } from "@/src/utils/navigation";

const PROFILE_HEADER = centerColors.headerDark;

const WEEK_DAYS = ["أح", "اث", "ثل", "أر", "خم", "جم", "سب"];

function getOptionLabel(
  options: { id: string; label: string }[],
  id: string
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

function formatDob(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function getCalendarCellColor(status: AttendanceCalendarDay["status"]): string {
  if (status === "present") return centerColors.accentGreen;
  if (status === "absent") return centerColors.accentRed;
  if (status === "late") return centerColors.accentOrange;
  return centerColors.cardBorder;
}

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const studentId = id ?? "";

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: studentQueryKeys.detail(studentId),
    queryFn: () => fetchStudentById(studentId),
    enabled: !!studentId,
  });

  const enrollmentMutation = useMutation({
    mutationFn: (enrollmentStatus: EnrollmentStatus) =>
      updateStudentEnrollmentStatus(studentId, enrollmentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.detail(studentId) });
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.list({}) });
      Alert.alert("تم", "تم تحديث حالة القيد");
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const promoteMutation = useMutation({
    mutationFn: () => promoteStudent(studentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.detail(studentId) });
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.list({}) });
      Alert.alert(
        "تم",
        data.levelName
          ? `تمت الترقية إلى «${data.levelName}»`
          : "تمت الترقية للمستوى التالي"
      );
    },
    onError: (err: Error) => Alert.alert("خطأ", err.message),
  });

  const handlePromote = () => {
    if (!profile) return;
    const nextHint =
      profile.level?.order != null
        ? `من «${profile.levelName}» إلى المستوى التالي؟`
        : `ترقية «${profile.fullName}» للمستوى التالي؟`;
    Alert.alert("ترقية مسار المطور", nextHint, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "ترقية",
        onPress: () => promoteMutation.mutate(),
      },
    ]);
  };

  const handleEnrollmentChange = (next: EnrollmentStatus) => {
    if (!profile || profile.enrollmentStatus === next) return;
    Alert.alert(
      "تأكيد",
      `تعيين حالة القيد إلى «${ENROLLMENT_STATUS_LABELS[next]}»؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: () => enrollmentMutation.mutate(next),
        },
      ]
    );
  };

  const { data: studentGrades } = useQuery({
    queryKey: gradesQueryKeys.student(studentId),
    queryFn: () => fetchStudentGrades(studentId),
    enabled: !!studentId,
  });

  const { data: studentAttendance } = useQuery({
    queryKey: gradesQueryKeys.studentAttendance(studentId),
    queryFn: () => fetchStudentAttendance(studentId),
    enabled: !!studentId,
  });

  const attendancePercent =
    studentAttendance?.attendancePercent ?? profile?.attendancePercent;
  const gradeAverage = profile?.gradeAverage;
  const absentDays = studentAttendance?.absentDays ?? profile?.absentDays ?? 0;
  const calendar =
    studentAttendance?.calendar ?? profile?.attendanceCalendar ?? [];
  const grades = studentGrades?.grades ?? [];
  const hasGrades = grades.length > 0;
  const hasAttendance = calendar.some((day) => day.status != null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() =>
              goBack(router, "/main/students" as import("expo-router").Href)
            }
            accessibilityLabel="رجوع"
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={24}
              color={centerColors.textOnAccent}
            />
          </Pressable>
          <Text style={styles.headerTitle}>ملف الطالب</Text>

          {isLoading ? (
            <ActivityIndicator color={centerColors.textOnAccent} style={styles.loader} />
          ) : isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error instanceof Error ? error.message : "تعذر تحميل الملف"}
              </Text>
              <Pressable onPress={() => refetch()}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : profile ? (
            <>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <Text style={styles.studentName}>{profile.fullName}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile.idNumber}</Text>
                </View>
                <View style={[styles.badge, styles.badgeCourse]}>
                  <Text style={styles.badgeText}>
                    {profile.levelShortName || profile.levelName}
                  </Text>
                </View>
                <View style={[styles.badge, styles.badgeActive]}>
                  <MaterialCommunityIcons name="check" size={14} color={centerColors.textOnAccent} />
                  <Text style={styles.badgeTextActive}>
                    {ENROLLMENT_STATUS_LABELS[
                      (profile.enrollmentStatus ?? "enrolled") as EnrollmentStatus
                    ]}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {profile ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>حالة القيد</Text>
              <View style={styles.enrollmentRow}>
                {ENROLLMENT_STATUS_OPTIONS.map((opt) => {
                  const selected =
                    (profile.enrollmentStatus ?? "enrolled") === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.enrollmentChip,
                        selected && styles.enrollmentChipOn,
                      ]}
                      disabled={enrollmentMutation.isPending}
                      onPress={() => handleEnrollmentChange(opt.id)}
                    >
                      <Text
                        style={[
                          styles.enrollmentChipText,
                          selected && styles.enrollmentChipTextOn,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {(profile.track ?? "mutor") === "mutor" ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>مسار المطور</Text>
                <Text style={styles.mutorHint}>
                  الترم ≈ 3 أشهر — الترقية يدوية من المشرفة (بدون أتمتة).
                </Text>
                <Pressable
                  style={[
                    styles.promoteBtn,
                    (promoteMutation.isPending ||
                      (profile.enrollmentStatus ?? "enrolled") !== "enrolled" ||
                      (profile.level?.order ?? 0) >= 8) &&
                      styles.promoteBtnDisabled,
                  ]}
                  disabled={
                    promoteMutation.isPending ||
                    (profile.enrollmentStatus ?? "enrolled") !== "enrolled" ||
                    (profile.level?.order ?? 0) >= 8
                  }
                  onPress={handlePromote}
                >
                  {promoteMutation.isPending ? (
                    <ActivityIndicator color={centerColors.textOnAccent} />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="arrow-up-bold-circle-outline"
                        size={20}
                        color={centerColors.textOnAccent}
                      />
                      <Text style={styles.promoteBtnText}>
                        ترقية للمستوى التالي
                      </Text>
                    </>
                  )}
                </Pressable>
                {(profile.level?.order ?? 0) >= 8 ? (
                  <Text style={styles.mutorHint}>
                    أعلى مستوى مطور — عيّني حالة القيد إلى خريجة عند اكتمال المسار.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.kpiCard}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValueRed}>{absentDays}</Text>
                <Text style={styles.kpiLabel}>غياب</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValueOrange}>
                  {gradeAverage == null ? "—" : gradeAverage}
                </Text>
                <Text style={styles.kpiLabel}>المعدل</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiValueGreen}>
                  {attendancePercent == null ? "—" : `${attendancePercent}%`}
                </Text>
                <Text style={styles.kpiLabel}>الحضور</Text>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              <Pressable style={[styles.actionBtn, styles.actionBtnBlue]}>
                <MaterialCommunityIcons name="printer" size={20} color={centerColors.accent} />
                <Text style={styles.actionBtnTextBlue}>طباعة السجل</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnDark]}>
                <MaterialCommunityIcons name="pencil" size={20} color={centerColors.textOnAccent} />
                <Text style={styles.actionBtnTextWhite}>تعديل البيانات</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnRed]}>
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={centerColors.accentRed} />
                <Text style={styles.actionBtnTextRed}>رفض / إلغاء</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnGreen]}>
                <MaterialCommunityIcons name="check" size={20} color={centerColors.textOnAccent} />
                <Text style={styles.actionBtnTextWhite}>قبول الطلب</Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="account" size={20} color={PROFILE_HEADER} />
                  <Text style={styles.sectionTitle}>البيانات الشخصية</Text>
                </View>
                <Pressable>
                  <Text style={styles.editLink}>تعديل</Text>
                </Pressable>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>الاسم الكامل</Text>
                <Text style={styles.dataValue}>{profile.fullName}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>رقم الهوية المدنية</Text>
                <Text style={styles.dataValue}>{profile.idNumber}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>تاريخ الميلاد</Text>
                <Text style={styles.dataValue}>{formatDob(profile.dob)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>الجنسية</Text>
                <Text style={styles.dataValue}>
                  {getOptionLabel(NATIONALITY_OPTIONS, profile.nationality)}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>المستوى الدراسي</Text>
                <Text style={styles.dataValue}>
                  {getOptionLabel(ACADEMIC_LEVEL_OPTIONS, profile.academicLevel)}
                </Text>
              </View>
              <View style={[styles.dataRow, styles.dataRowLast]}>
                <Text style={styles.dataLabel}>رقم الهاتف</Text>
                <Text style={styles.dataValue}>{profile.phone}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.attendanceHeader}>
                <View style={styles.attendanceTitleRow}>
                  <MaterialCommunityIcons name="calendar-month" size={22} color={PROFILE_HEADER} />
                  <Text style={styles.sectionTitle}>سجل الحضور</Text>
                </View>
                <Text style={styles.attendancePercent}>
                  {attendancePercent == null ? "—" : `${attendancePercent}%`}
                </Text>
              </View>
              {hasAttendance ? (
                <>
                  <View style={styles.calendarGrid}>
                    {WEEK_DAYS.map((d) => (
                      <View key={d} style={styles.calendarDayHeader}>
                        <Text style={styles.calendarDayText}>{d}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {calendar.map((day) => {
                      const dayNum = day.date.split("-")[2] ?? "";
                      return (
                        <View
                          key={day.date}
                          style={[
                            styles.calendarCell,
                            { backgroundColor: getCalendarCellColor(day.status) },
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarCellText,
                              day.status != null && styles.calendarCellTextActive,
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.calendarHint}>آخر 30 يوماً</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>
                  لا يوجد سجل حضور بعد — سجّلي التحضير من شاشة المادة
                </Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.gradesEmoji}>📝</Text>
                  <Text style={styles.sectionTitle}>الدرجات الدراسية</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={centerColors.text} />
              </View>
              {hasGrades ? (
                <View style={styles.gradesList}>
                  {grades.map((grade) => {
                    const labelInfo = getGradeLabelInfo(grade.total);
                    return (
                      <View key={`${grade.subjectIndex}-${grade.levelId}`} style={styles.gradeRow}>
                        <View style={styles.gradeRowMain}>
                          <Text style={styles.gradeSubject}>
                            {getSubjectName(grade.subjectIndex)}
                          </Text>
                          <Text style={styles.gradeTotal}>{grade.total}</Text>
                        </View>
                        <View
                          style={[styles.gradeBadge, { backgroundColor: labelInfo.bg }]}
                        >
                          <Text style={[styles.gradeBadgeText, { color: labelInfo.text }]}>
                            {grade.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  لا توجد درجات مسجّلة بعد — سجّلي الدرجات من شاشة المادة
                </Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: centerColors.surfaceMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    backgroundColor: PROFILE_HEADER,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.textOnAccent,
    marginBottom: spacing.lg,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  errorBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: centerColors.textOnAccent,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.textOnAccent,
    textDecorationLine: "underline",
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  studentName: {
    fontSize: 20,
    fontWeight: "700",
    color: centerColors.textOnAccent,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeCourse: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  badgeActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: centerColors.accentGreen,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: centerColors.textOnAccent,
  },
  badgeTextActive: {
    fontSize: 12,
    fontWeight: "600",
    color: centerColors.textOnAccent,
  },
  kpiCard: {
    flexDirection: "row",
    backgroundColor: centerColors.cardBg,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    borderRadius: 16,
    padding: spacing.xl,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
  },
  kpiValueRed: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.accentRed,
  },
  kpiValueOrange: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.accentOrange,
  },
  kpiValueGreen: {
    fontSize: 24,
    fontWeight: "700",
    color: centerColors.accentGreen,
  },
  kpiLabel: {
    fontSize: 13,
    color: centerColors.textSecondary,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: 12,
  },
  actionBtnBlue: {
    backgroundColor: "#e8f5fd",
  },
  actionBtnDark: {
    backgroundColor: PROFILE_HEADER,
  },
  actionBtnRed: {
    backgroundColor: "#fee2e2",
  },
  actionBtnGreen: {
    backgroundColor: centerColors.accentGreen,
  },
  actionBtnTextBlue: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.accent,
  },
  actionBtnTextWhite: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.textOnAccent,
  },
  actionBtnTextRed: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.accentRed,
  },
  sectionCard: {
    backgroundColor: centerColors.cardBg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  enrollmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  enrollmentChip: {
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  enrollmentChipOn: {
    backgroundColor: centerColors.accent,
    borderColor: centerColors.accent,
  },
  enrollmentChipText: {
    fontSize: 13,
    color: centerColors.text,
  },
  enrollmentChipTextOn: {
    color: "#fff",
    fontWeight: "600",
  },
  mutorHint: {
    fontSize: 13,
    color: centerColors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    textAlign: "right",
    writingDirection: "rtl",
  },
  promoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: PROFILE_HEADER,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  promoteBtnDisabled: {
    opacity: 0.45,
  },
  promoteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.textOnAccent,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
  },
  editLink: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.accent,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 14,
    color: centerColors.textSecondary,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.text,
  },
  attendanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  attendanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  attendancePercent: {
    fontSize: 18,
    fontWeight: "700",
    color: PROFILE_HEADER,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayHeader: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: centerColors.textSecondary,
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderRadius: 6,
  },
  calendarCellText: {
    fontSize: 11,
    color: centerColors.textSecondary,
    fontWeight: "600",
  },
  calendarCellTextActive: {
    color: centerColors.textOnAccent,
  },
  calendarHint: {
    fontSize: 12,
    color: centerColors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  gradesEmoji: {
    fontSize: 18,
  },
  gradesList: {
    gap: spacing.sm,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  gradeRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: spacing.sm,
  },
  gradeSubject: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.text,
  },
  gradeTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.accent,
  },
  gradeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
