import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { colors, layout, radius, space } from "@/src/theme";
import {
  Avatar,
  Badge,
  Button,
  ChoiceChips,
  EmptyState,
  ErrorState,
  FilterBar,
  Header,
  IconButton,
  Screen,
  SearchBar,
  SelectField,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from "@/src/ui";
import { fetchStudents, studentQueryKeys, type FetchStudentsParams } from "@/src/api/students";
import { fetchLevelsByCenter, levelQueryKeys } from "@/src/api/levels";
import { useAuth } from "@/src/context/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebounce";
import {
  ENROLLMENT_LABELS,
  ENROLLMENT_TONES,
  PERFORMANCE,
  STUDENT_TYPE_LABELS,
  STUDENT_TYPE_OPTIONS,
  TRACK_LABELS,
  TRACK_OPTIONS,
  academicLevelLabel,
  nationalityLabel,
  type StudentTrack,
  type StudentType,
} from "@/src/constants/domain";
import type { StudentListItem } from "@/src/types/student";
import { exportWorkbook } from "@/src/utils/excel";
import { formatPhone } from "@/src/constants/phone";

type QuickFilter = "all" | "enrolled" | "suspended" | "graduated" | "attention" | "excellent";

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "enrolled", label: "مسجّلة" },
  { id: "attention", label: "تحتاج متابعة" },
  { id: "excellent", label: "متفوقة" },
  { id: "suspended", label: "موقوفة القيد" },
  { id: "graduated", label: "خريجة" },
];

function matchesQuick(student: StudentListItem, filter: QuickFilter): boolean {
  switch (filter) {
    case "enrolled":
    case "suspended":
    case "graduated":
      return student.enrollmentStatus === filter;
    case "attention":
      return student.enrollmentStatus === "enrolled" && (student.status === "warning" || student.status === "frequent_absence");
    case "excellent":
      return student.status === "excellent";
    default:
      return true;
  }
}

export default function StudentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ filter?: string; levelId?: string }>();
  const { user } = useAuth();
  const centerId = user?.centerProfile?.id ?? "";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [track, setTrack] = useState<StudentTrack | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [studentType, setStudentType] = useState<StudentType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (params.filter && QUICK_FILTERS.some((f) => f.id === params.filter)) setQuick(params.filter as QuickFilter);
    if (params.levelId) setLevelId(params.levelId);
  }, [params.filter, params.levelId]);

  const serverFilters: FetchStudentsParams = {
    search: debouncedSearch || undefined,
    track: track ?? undefined,
    levelId: levelId ?? undefined,
    studentType: studentType ?? undefined,
  };

  const query = useQuery({
    queryKey: studentQueryKeys.list(serverFilters),
    queryFn: () => fetchStudents(serverFilters),
  });

  const levelsQuery = useQuery({
    queryKey: levelQueryKeys.list(centerId),
    queryFn: () => fetchLevelsByCenter(centerId),
    enabled: !!centerId,
  });

  const all = query.data ?? [];
  const students = useMemo(() => all.filter((s) => matchesQuick(s, quick)), [all, quick]);

  const quickOptions = QUICK_FILTERS.map((f) => ({ ...f, count: all.filter((s) => matchesQuick(s, f.id)).length }));
  const advancedCount = [track, levelId, studentType].filter(Boolean).length;
  const levelOptions = (levelsQuery.data ?? [])
    .filter((l) => !track || l.track === track)
    .map((l) => ({ id: l.id, label: l.shortName }));

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportWorkbook(
        [
          {
            name: "الطالبات",
            title: `قائمة الطالبات — ${user?.centerProfile?.nameAr ?? ""}`,
            columns: [
              { header: "م", width: 5 },
              { header: "الاسم", width: 28 },
              { header: "الرقم المدني", width: 15 },
              { header: "الهاتف", width: 16 },
              { header: "المسار", width: 10 },
              { header: "المستوى", width: 14 },
              { header: "مستجدة/مستمرة", width: 13 },
              { header: "حالة القيد", width: 12 },
              { header: "الجنسية", width: 12 },
              { header: "المؤهل", width: 12 },
              { header: "الحضور %", width: 10 },
              { header: "المعدل", width: 9 },
            ],
            rows: students.map((s, i) => [
              i + 1,
              s.fullName,
              s.idNumber,
              formatPhone(s.phone).replace("‎", ""),
              TRACK_LABELS[s.track] ?? s.track,
              s.levelShortName || "—",
              s.studentType ? STUDENT_TYPE_LABELS[s.studentType] : "",
              ENROLLMENT_LABELS[s.enrollmentStatus],
              nationalityLabel(s.nationality),
              academicLevelLabel(s.academicLevel),
              s.attendancePercent ?? "",
              s.gradeAverage ?? "",
            ]),
          },
        ],
        "قائمة_الطالبات"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="ابحثي بالاسم أو الرقم المدني أو الهاتف" />
      <View style={styles.filterRow}>
        <View style={styles.flex}>
          <FilterBar options={quickOptions} value={quick} onChange={setQuick} />
        </View>
      </View>
      {advancedCount > 0 ? (
        <View style={styles.activeFilters}>
          {track ? <Badge label={`المسار: ${TRACK_LABELS[track]}`} tone="primary" /> : null}
          {levelId ? (
            <Badge label={`المستوى: ${levelOptions.find((l) => l.id === levelId)?.label ?? "…"}`} tone="primary" />
          ) : null}
          {studentType ? <Badge label={STUDENT_TYPE_LABELS[studentType]} tone="primary" /> : null}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setTrack(null);
              setLevelId(null);
              setStudentType(null);
            }}
          >
            مسح الفلاتر
          </Button>
        </View>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {query.isLoading ? "جاري التحميل…" : `${students.length} طالبة`}
      </Text>
    </View>
  );

  return (
    <Screen
      withTabBar
      scroll={false}
      padded={false}
      header={
        <Header
          large
          title="الطالبات"
          actions={
            <>
              <IconButton
                icon="tune-variant"
                accessibilityLabel="فلترة متقدمة"
                variant="surface"
                badge={advancedCount || undefined}
                onPress={() => setSheetOpen(true)}
              />
              <IconButton
                icon="microsoft-excel"
                accessibilityLabel="تصدير Excel"
                variant="surface"
                disabled={exporting || students.length === 0}
                onPress={handleExport}
              />
              <IconButton
                icon="plus"
                accessibilityLabel="إضافة طالبة"
                variant="primary"
                onPress={() => router.push("/main/add-student" as Href)}
              />
            </>
          }
        />
      }
    >
      {query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.isLoading ? [] : students}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            query.isLoading ? (
              <SkeletonList rows={6} />
            ) : (
              <EmptyState
                icon="account-search-outline"
                title={all.length === 0 && !debouncedSearch && !advancedCount ? "لا توجد طالبات بعد" : "لا نتائج مطابقة"}
                description={
                  all.length === 0 && !debouncedSearch && !advancedCount
                    ? "تظهر الطالبات هنا بعد قبول طلبات التسجيل أو الإضافة اليدوية"
                    : "جرّبي تغيير البحث أو الفلاتر"
                }
                actionLabel={all.length === 0 ? "إضافة طالبة" : undefined}
                onAction={() => router.push("/main/add-student" as Href)}
              />
            )
          }
          renderItem={({ item }) => <StudentRow student={item} onPress={() => router.push(`/main/student-profile/${item.id}` as Href)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="فلترة الطالبات"
        footer={
          <Button fullWidth onPress={() => setSheetOpen(false)}>
            عرض النتائج
          </Button>
        }
      >
        <ChoiceChips
          label="مسار الانضمام"
          options={TRACK_OPTIONS.map((t) => ({ id: t.id, label: t.label }))}
          value={track}
          onChange={(v: StudentTrack) => {
            setTrack(track === v ? null : v);
            setLevelId(null);
          }}
        />
        <SelectField
          label="المستوى"
          options={[{ id: "", label: "كل المستويات" }, ...levelOptions]}
          value={levelId ?? ""}
          onChange={(id) => setLevelId(id || null)}
          placeholder="كل المستويات"
        />
        <ChoiceChips
          label="مستجدة / مستمرة"
          options={STUDENT_TYPE_OPTIONS.map((t) => ({ id: t.id, label: t.label }))}
          value={studentType}
          onChange={(v: StudentType) => setStudentType(studentType === v ? null : v)}
        />
      </Sheet>
    </Screen>
  );
}

function StudentRow({ student, onPress }: { student: StudentListItem; onPress: () => void }) {
  const perf = PERFORMANCE[student.status] ?? PERFORMANCE.regular;
  const inactive = student.enrollmentStatus !== "enrolled";
  const lowAttendance = student.attendancePercent != null && student.attendancePercent < 70;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`فتح ملف ${student.fullName}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={student.fullName} uri={student.photoUrl} size={48} tone={inactive ? "neutral" : "primary"} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {student.fullName}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1} tabular>
          {[student.levelShortName || TRACK_LABELS[student.track], student.idNumber].join(" · ")}
        </Text>
        <View style={styles.badges}>
          {inactive ? (
            <Badge
              label={ENROLLMENT_LABELS[student.enrollmentStatus]}
              tone={ENROLLMENT_TONES[student.enrollmentStatus]}
              size="sm"
            />
          ) : (
            <Badge label={perf.label} tone={perf.tone} icon={perf.icon} size="sm" />
          )}
          {student.studentType === "new" ? <Badge label="مستجدة" tone="info" size="sm" /> : null}
        </View>
      </View>
      <View style={styles.metrics}>
        <Text variant="bodyStrong" tabular color={lowAttendance ? "danger" : "text"}>
          {student.attendancePercent == null ? "—" : `${student.attendancePercent}%`}
        </Text>
        <Text variant="micro" color="textMuted">
          حضور
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBlock: { gap: space[3], paddingBottom: space[3] },
  filterRow: { flexDirection: "row", alignItems: "center" },
  activeFilters: { flexDirection: "row", flexWrap: "wrap", gap: space[2], alignItems: "center" },
  listContent: { paddingHorizontal: layout.screenPadding, paddingBottom: space[10] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  badges: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  metrics: { alignItems: "center", minWidth: 52 },
  separator: { height: space[2] },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: 0.99 }] },
});
