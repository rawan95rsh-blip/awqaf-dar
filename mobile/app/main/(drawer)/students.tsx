import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  I18nManager,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { centerColors, spacing } from "@/constants";
import DrawerTrigger from "@/src/components/DrawerTrigger";
import { fetchStudents, studentQueryKeys } from "@/src/api/students";
import type { StudentStatus } from "@/src/types/student";

const STATUS_CONFIG = {
  regular: { label: "منتظمة", bg: centerColors.accentGreen, text: centerColors.textOnAccent },
  warning: {
    label: "! تحذير",
    bg: centerColors.accentYellow,
    text: centerColors.text,
  },
  excellent: { label: "متفوقة ⭐", bg: centerColors.accentGreen, text: centerColors.textOnAccent },
  frequent_absence: { label: "غياب متكرر ❌", bg: centerColors.accentRed, text: centerColors.textOnAccent },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "review", label: "قيد المراجعة" },
  { id: "accepted", label: "مقبولة" },
  { id: "absence", label: "غياب متكرر" },
] as const;

function getMetricColor(attendance: number | null, grade: number | null) {
  const att = attendance ?? 0;
  const grd = grade ?? 0;
  if (attendance == null && grade == null) return centerColors.textSecondary;
  if (att >= 85 && grd >= 85) return centerColors.accentGreen;
  if (att >= 70 || grd >= 70) return centerColors.accentOrange;
  return centerColors.accentRed;
}

function formatMetric(value: number | null): string {
  return value == null ? "—" : String(value);
}

export default function StudentsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: students = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: studentQueryKeys.list({ search: debouncedSearch }),
    queryFn: () => fetchStudents({ search: debouncedSearch }),
  });

  const handleFilterPress = (filterId: string) => {
    if (filterId !== "all") {
      Alert.alert("قريباً", "هذا الفلتر سيتوفر في تحديث لاحق");
      return;
    }
    setActiveFilter(filterId);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topRow,
            { flexDirection: I18nManager.isRTL ? "row" : "row-reverse" },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>الطلاب</Text>
            <Text style={styles.subtitle}>{students.length} طالب مسجل</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/main/add-student")}
              accessibilityLabel="إضافة طالبة جديدة"
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={centerColors.background}
              />
              <Text style={styles.addButtonText}>جديدة</Text>
            </Pressable>
            <Pressable style={styles.settingsButton}>
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={centerColors.text}
              />
            </Pressable>
            <DrawerTrigger />
          </View>
        </View>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={centerColors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث بالاسم أو الهوية..."
            placeholderTextColor={centerColors.textSecondary}
            accessibilityLabel="بحث"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            const count = f.id === "all" ? students.length : null;
            return (
              <Pressable
                key={f.id}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleFilterPress(f.id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {f.label}
                  {count != null ? ` (${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.exportButton}>
          <MaterialCommunityIcons
            name="microsoft-excel"
            size={20}
            color={centerColors.primaryButtonText}
          />
          <Text style={styles.exportButtonText}>تصدير Excel</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator size="large" color={centerColors.accent} style={styles.loader} />
        ) : isError ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : "تعذر تحميل الطلاب"}
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد نتائج</Text>
        ) : (
          <View style={styles.list}>
            {students.map((student) => {
              const statusKey = student.status as StatusKey;
              const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.regular;
              const metricColor = getMetricColor(
                student.attendancePercent,
                student.gradeAverage
              );
              return (
                <Pressable
                  key={student.id}
                  style={styles.studentCard}
                  onPress={() =>
                    router.push(
                      `/main/student-profile/${student.id}` as import("expo-router").Href
                    )
                  }
                >
                  <View style={styles.studentAvatar}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.fullName}</Text>
                    <Text style={styles.studentCourse}>
                      {student.levelShortName} - {student.idNumber}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: status.text }]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.studentMetrics}>
                    <Text style={[styles.metricGrade, { color: metricColor }]}>
                      {formatMetric(student.gradeAverage)}
                    </Text>
                    <Text
                      style={[styles.metricAttendance, { color: metricColor }]}
                    >
                      {student.attendancePercent == null
                        ? "—"
                        : `${student.attendancePercent}%`}
                    </Text>
                    <Text style={styles.metricLabel}>حضور معدل</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {isRefetching && !isLoading ? (
          <ActivityIndicator size="small" color={centerColors.accent} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: centerColors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  header: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: centerColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: centerColors.textSecondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: centerColors.text,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    color: centerColors.background,
    fontWeight: "600",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: centerColors.cardBg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  searchIcon: {
    marginLeft: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: centerColors.text,
    paddingVertical: spacing.md,
    ...(Platform.OS === "web" ? { outlineStyle: "solid" as const } : {}),
  },
  filtersScroll: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.lg,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: centerColors.cardBg,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  filterTabActive: {
    backgroundColor: centerColors.text,
    borderColor: centerColors.text,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.text,
  },
  filterTabTextActive: {
    color: centerColors.background,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: centerColors.primaryButton,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  exportButtonText: {
    color: centerColors.primaryButtonText,
    fontSize: 15,
    fontWeight: "600",
  },
  loader: {
    marginVertical: spacing.xl,
  },
  messageBox: {
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: centerColors.accentRed,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: centerColors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: centerColors.textSecondary,
    textAlign: "center",
    marginVertical: spacing.xl,
  },
  list: {
    gap: 0,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: centerColors.cardBg,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: centerColors.cardBorder,
  },
  studentMetrics: {
    alignItems: "center",
  },
  metricGrade: {
    fontSize: 20,
    fontWeight: "700",
  },
  metricAttendance: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: centerColors.textSecondary,
    marginTop: 4,
  },
  studentInfo: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: centerColors.text,
    marginBottom: 4,
  },
  studentCourse: {
    fontSize: 13,
    color: centerColors.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: centerColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 24,
  },
});
