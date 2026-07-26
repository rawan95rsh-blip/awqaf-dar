import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  I18nManager,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import {
  attendanceQueryKeys,
  fetchAttendance,
  formatAttendanceDate,
  saveAttendanceBulk,
} from "@/src/api/attendance";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { goBack } from "@/src/utils/navigation";
import { getSubjectName } from "@/src/constants/subjects";
import type { AttendanceStatus } from "@/src/types/attendance";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAYS[date.getDay()] ?? "الأحد";
  return `${dayName} ${d}/${m}/${y}`;
}

export default function AttendanceScreen() {
  const { levelId, subjectIndex, date, returnTo } = useLocalSearchParams<{
    levelId: string;
    subjectIndex: string;
    date?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedLevelId = levelId ?? "";
  const subjectIdx = parseInt(subjectIndex ?? "0", 10);
  const subjectName = getSubjectName(subjectIdx);
  const sheetDate =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : formatAttendanceDate();
  const backHref =
    typeof returnTo === "string" && returnTo.startsWith("/")
      ? (returnTo as import("expo-router").Href)
      : (`/main/subject/${resolvedLevelId}/${subjectIndex}` as import("expo-router").Href);

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | null>>({});
  const [search, setSearch] = useState("");

  const {
    data: level,
    isLoading: levelLoading,
    isError: levelError,
    error: levelErr,
  } = useQuery({
    queryKey: levelQueryKeys.detail(resolvedLevelId),
    queryFn: () => fetchLevelById(resolvedLevelId),
    enabled: !!resolvedLevelId,
  });

  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
    error: studentsErr,
  } = useQuery({
    queryKey: levelQueryKeys.students(resolvedLevelId),
    queryFn: () => fetchLevelStudents(resolvedLevelId),
    enabled: !!resolvedLevelId,
  });

  const {
    data: attendanceSheet,
    isLoading: attendanceLoading,
    isError: attendanceError,
    error: attendanceErr,
  } = useQuery({
    queryKey: attendanceQueryKeys.sheet(resolvedLevelId, subjectIdx, sheetDate),
    queryFn: () => fetchAttendance(resolvedLevelId, subjectIdx, sheetDate),
    enabled: !!resolvedLevelId,
  });

  useEffect(() => {
    if (!attendanceSheet?.records) return;
    const next: Record<string, AttendanceStatus | null> = {};
    for (const record of attendanceSheet.records) {
      next[record.studentId] = record.status;
    }
    setAttendance(next);
  }, [attendanceSheet]);

  const saveMutation = useMutation({
    mutationFn: saveAttendanceBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.sheet(resolvedLevelId, subjectIdx, sheetDate),
      });
      Alert.alert("تم الحفظ", "تم حفظ التحضير بنجاح", [
        { text: "حسناً", onPress: () => goBack(router, backHref) },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("خطأ", err.message);
    },
  });

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.idNumber.includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [students, search]);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    students.forEach((s) => {
      const st = attendance[s.id];
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
    });
    return { present, absent, late, total: students.length };
  }, [students, attendance]);

  const allMarked = useMemo(() => {
    return students.length > 0 && students.every((s) => attendance[s.id] != null);
  }, [students, attendance]);

  const isLoading = levelLoading || studentsLoading || attendanceLoading;
  const isError = levelError || studentsError || attendanceError;
  const errorMessage =
    (levelErr as Error | undefined)?.message ??
    (studentsErr as Error | undefined)?.message ??
    (attendanceErr as Error | undefined)?.message ??
    "حدث خطأ";

  const setStudentStatus = (studentId: string, status: AttendanceStatus | null) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const clearAll = () => setAttendance({});
  const markAllAbsent = () => {
    const next: Record<string, AttendanceStatus | null> = {};
    students.forEach((s) => (next[s.id] = "absent"));
    setAttendance(next);
  };
  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus | null> = {};
    students.forEach((s) => (next[s.id] = "present"));
    setAttendance(next);
  };

  const handleSave = () => {
    const records = students
      .filter((s) => attendance[s.id] != null)
      .map((s) => ({
        studentId: s.id,
        status: attendance[s.id] as AttendanceStatus,
      }));

    if (records.length === 0) {
      Alert.alert("تنبيه", "سجّلي تحضير طالبة واحدة على الأقل");
      return;
    }

    saveMutation.mutate({
      levelId: resolvedLevelId,
      subjectIndex: subjectIdx,
      date: sheetDate,
      records,
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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => goBack(router, backHref)}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
            size={24}
            color={centerColors.text}
          />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{subjectName}</Text>
          <Text style={styles.headerSubtitle}>
            {level?.fullName ?? "—"} - {formatDisplayDate(sheetDate)}
          </Text>
        </View>
        <Pressable
          style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending || isLoading}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={centerColors.textOnAccent} />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color={centerColors.textOnAccent} />
              <Text style={styles.saveBtnText}>حفظ</Text>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={centerColors.accent} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statLate]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={centerColors.accentOrange} />
              <Text style={styles.statValue}>{stats.late}</Text>
              <Text style={styles.statLabel}>متأخر</Text>
            </View>
            <View style={[styles.statCard, styles.statAbsent]}>
              <MaterialCommunityIcons name="close" size={24} color={centerColors.accentRed} />
              <Text style={styles.statValue}>{stats.absent}</Text>
              <Text style={styles.statLabel}>غائب</Text>
            </View>
            <View style={[styles.statCard, styles.statPresent]}>
              <MaterialCommunityIcons name="check" size={24} color={centerColors.accentGreen} />
              <Text style={styles.statValue}>{stats.present}</Text>
              <Text style={styles.statLabel}>حاضر</Text>
            </View>
            <View style={[styles.statCard, styles.statTotal]}>
              <Text style={styles.statValueTotal}>{stats.total}</Text>
              <Text style={styles.statLabelTotal}>إجمالي</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color={centerColors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث بالاسم أو الرقم..."
                placeholderTextColor={centerColors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={styles.actionsBar}>
            <Pressable style={styles.actionBtnGray} onPress={clearAll}>
              <Text style={styles.actionBtnGrayText}>مسح</Text>
            </Pressable>
            <Pressable style={styles.actionBtnRed} onPress={markAllAbsent}>
              <MaterialCommunityIcons name="close" size={18} color={centerColors.textOnAccent} />
              <Text style={styles.actionBtnRedText}>كل غائب</Text>
            </Pressable>
            <Pressable style={styles.actionBtnGreen} onPress={markAllPresent}>
              <MaterialCommunityIcons name="check" size={18} color={centerColors.textOnAccent} />
              <Text style={styles.actionBtnGreenText}>كل حاضر</Text>
            </Pressable>
            {allMarked && (
              <View style={styles.allDone}>
                <MaterialCommunityIcons name="check-circle" size={20} color={centerColors.accentGreen} />
                <Text style={styles.allDoneText}>تم تحضير الجميع!</Text>
              </View>
            )}
          </View>

          <View style={styles.studentList}>
            {filteredStudents.length === 0 ? (
              <Text style={styles.emptyText}>لا توجد طالبات في هذا المستوى</Text>
            ) : (
              filteredStudents.map((student) => {
                const status = attendance[student.id];
                return (
                  <View key={student.id} style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.fullName}</Text>
                      <Text style={styles.studentId}>{student.idNumber}</Text>
                      <Text style={styles.studentPrev}>
                        حضور: {student.attendancePercent == null ? "—" : `${student.attendancePercent}%`}
                      </Text>
                    </View>
                    <View style={styles.studentActions}>
                      <Pressable
                        style={[styles.statusBtn, status === "present" && styles.statusBtnActive]}
                        onPress={() =>
                          setStudentStatus(student.id, status === "present" ? null : "present")
                        }
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={22}
                          color={status === "present" ? centerColors.accentGreen : centerColors.textSecondary}
                        />
                      </Pressable>
                      <Pressable
                        style={[styles.statusBtn, status === "absent" && styles.statusBtnActive]}
                        onPress={() =>
                          setStudentStatus(student.id, status === "absent" ? null : "absent")
                        }
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={22}
                          color={status === "absent" ? centerColors.accentRed : centerColors.textSecondary}
                        />
                      </Pressable>
                      <Pressable
                        style={[styles.statusBtn, status === "late" && styles.statusBtnActive]}
                        onPress={() =>
                          setStudentStatus(student.id, status === "late" ? null : "late")
                        }
                      >
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={22}
                          color={status === "late" ? centerColors.accentOrange : centerColors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.avatarEmoji}>👤</Text>
                      {status === "present" && (
                        <View style={styles.avatarBadge}>
                          <MaterialCommunityIcons name="check" size={14} color={centerColors.textOnAccent} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: centerColors.background },
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
    paddingVertical: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: centerColors.cardBorder,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: centerColors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: centerColors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    gap: spacing.xs,
    minWidth: 72,
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: centerColors.textOnAccent, fontSize: 14, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  statsRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  statLate: { backgroundColor: "rgba(234,88,12,0.15)" },
  statAbsent: { backgroundColor: "rgba(239,68,68,0.15)" },
  statPresent: { backgroundColor: "rgba(34,197,94,0.15)" },
  statTotal: {
    backgroundColor: centerColors.primaryButton,
    borderColor: centerColors.primaryButton,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: centerColors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: centerColors.textSecondary, marginTop: 2 },
  statValueTotal: { fontSize: 18, fontWeight: "700", color: centerColors.primaryButtonText, marginTop: 4 },
  statLabelTotal: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.cardBg,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: centerColors.text,
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  actionBtnGray: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: centerColors.cardBg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  actionBtnGrayText: { color: centerColors.textSecondary, fontSize: 13 },
  actionBtnRed: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: centerColors.accentRed,
    gap: spacing.xs,
  },
  actionBtnRedText: { color: centerColors.textOnAccent, fontSize: 13, fontWeight: "600" },
  actionBtnGreen: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: centerColors.accentGreen,
    gap: spacing.xs,
  },
  actionBtnGreenText: { color: centerColors.textOnAccent, fontSize: 13, fontWeight: "600" },
  allDone: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: "auto",
    gap: spacing.xs,
  },
  allDoneText: { color: centerColors.accentGreen, fontSize: 13, fontWeight: "600" },
  studentList: { gap: spacing.md },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "600", color: centerColors.text },
  studentId: { fontSize: 12, color: centerColors.textSecondary, marginTop: 2 },
  studentPrev: { fontSize: 11, color: centerColors.textMuted, marginTop: 2 },
  studentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusBtn: {
    padding: spacing.xs,
  },
  statusBtnActive: {},
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: centerColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  avatarEmoji: { fontSize: 22 },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: centerColors.accentGreen,
    alignItems: "center",
    justifyContent: "center",
  },
});
