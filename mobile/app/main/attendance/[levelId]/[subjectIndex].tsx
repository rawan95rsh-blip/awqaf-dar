import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useLocalSearchParams, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, layout, space } from "@/src/theme";
import {
  Badge,
  Button,
  DateField,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Screen,
  SearchBar,
  SkeletonList,
  Text,
  useToast,
} from "@/src/ui";
import AttendanceRow from "@/src/components/levels/AttendanceRow";
import { confirmAsync } from "@/src/components/levels/confirm";
import { isDateKey, parseDateKey } from "@/src/components/levels/helpers";
import { useUnsavedChangesGuard } from "@/src/components/levels/useUnsavedChangesGuard";
import {
  attendanceQueryKeys,
  fetchAttendance,
  formatAttendanceDate,
  saveAttendanceBulk,
} from "@/src/api/attendance";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { studentQueryKeys } from "@/src/api/students";
import { SUBJECT_NAMES, subjectName } from "@/src/constants/domain";
import type { AttendanceStatus } from "@/src/types/attendance";
import { addDays, formatWeekday } from "@/src/utils/format";

type StatusMap = Record<string, AttendanceStatus>;

function sameStatus(a: StatusMap, b: StatusMap, id: string): boolean {
  return (a[id] ?? null) === (b[id] ?? null);
}

/** كشف تحضير الغياب لمادة في مستوى ليوم محدد */
export default function AttendanceScreen() {
  const params = useLocalSearchParams<{ levelId: string; subjectIndex: string; date?: string; returnTo?: string }>();
  const levelId = params.levelId ?? "";
  const parsed = Number.parseInt(params.subjectIndex ?? "0", 10);
  const subjectIdx = Number.isInteger(parsed) && parsed >= 0 && parsed < SUBJECT_NAMES.length ? parsed : 0;
  const backHref = (
    typeof params.returnTo === "string" && params.returnTo.startsWith("/")
      ? params.returnTo
      : `/main/subject/${levelId}/${subjectIdx}`
  ) as Href;

  const toast = useToast();
  const queryClient = useQueryClient();
  const todayKey = formatAttendanceDate();
  const [dateKey, setDateKey] = useState(() => (isDateKey(params.date) ? params.date : todayKey));
  const [draft, setDraft] = useState<StatusMap>({});
  const [baseline, setBaseline] = useState<StatusMap>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const levelQuery = useQuery({
    queryKey: levelQueryKeys.detail(levelId),
    queryFn: () => fetchLevelById(levelId),
    enabled: !!levelId,
  });
  const studentsQuery = useQuery({
    queryKey: levelQueryKeys.students(levelId),
    queryFn: () => fetchLevelStudents(levelId),
    enabled: !!levelId,
  });
  const sheetQuery = useQuery({
    queryKey: attendanceQueryKeys.sheet(levelId, subjectIdx, dateKey),
    queryFn: () => fetchAttendance(levelId, subjectIdx, dateKey),
    enabled: !!levelId,
  });

  // تهيئة المسودة مرة واحدة لكل تاريخ (لا تُمسح تعديلات المشرفة عند إعادة الجلب في الخلفية)
  useEffect(() => {
    if (!sheetQuery.data || loadedKey === dateKey) return;
    const map: StatusMap = {};
    for (const record of sheetQuery.data.records) map[record.studentId] = record.status;
    setDraft(map);
    setBaseline(map);
    setLoadedKey(dateKey);
  }, [sheetQuery.data, dateKey, loadedKey]);

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const visible = useMemo(() => {
    const q = search.trim();
    if (!q) return students;
    return students.filter((s) => s.fullName.includes(q) || s.idNumber.includes(q));
  }, [students, search]);

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, unmarked: 0 };
    for (const s of students) {
      const st = draft[s.id];
      if (st) c[st] += 1;
      else c.unmarked += 1;
    }
    return c;
  }, [students, draft]);

  const changedIds = useMemo(
    () => new Set(students.filter((s) => !sameStatus(draft, baseline, s.id)).map((s) => s.id)),
    [students, draft, baseline]
  );
  const dirty = changedIds.size > 0;
  const ready = loadedKey === dateKey && !studentsQuery.isLoading;

  const saveMutation = useMutation({
    mutationFn: () =>
      saveAttendanceBulk({
        levelId,
        subjectIndex: subjectIdx,
        date: dateKey,
        records: students.filter((s) => draft[s.id]).map((s) => ({ studentId: s.id, status: draft[s.id] })),
      }),
    onSuccess: (result) => {
      setBaseline({ ...draft });
      void queryClient.invalidateQueries({ queryKey: attendanceQueryKeys.sheet(levelId, subjectIdx, dateKey) });
      void queryClient.invalidateQueries({ queryKey: levelQueryKeys.students(levelId) });
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(result?.message || `تم حفظ تحضير ${result?.savedCount ?? ""} طالبة`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useUnsavedChangesGuard(dirty && !saveMutation.isPending, "لم يُحفظ التحضير بعد. هل تريدين الخروج دون حفظ؟");

  const setStatus = useCallback(
    (studentId: string, status: AttendanceStatus | null) => {
      setDraft((prev) => {
        // التحضير المحفوظ يُعدَّل ولا يُمسح (الخادم لا يحذف السجلات)
        if (status == null && baseline[studentId]) return prev;
        const next = { ...prev };
        if (status) next[studentId] = status;
        else delete next[studentId];
        return next;
      });
    },
    [baseline]
  );

  const markRemainingPresent = () => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const s of students) if (!next[s.id]) next[s.id] = "present";
      return next;
    });
  };

  const changeDate = async (nextKey: string) => {
    if (nextKey === dateKey) return;
    if (dirty) {
      const ok = await confirmAsync({
        title: "تغيير التاريخ؟",
        message: "لم يُحفظ تحضير هذا اليوم بعد، وستُفقد التعديلات.",
        confirmLabel: "تغيير دون حفظ",
        cancelLabel: "البقاء",
        destructive: true,
      });
      if (!ok) return;
    }
    setDateKey(nextKey);
  };

  const shiftDay = (delta: number) => void changeDate(formatAttendanceDate(addDays(parseDateKey(dateKey), delta)));

  const save = async () => {
    const marked = students.filter((s) => draft[s.id]).length;
    if (marked === 0) {
      toast.error("سجّلي تحضير طالبة واحدة على الأقل");
      return;
    }
    if (counts.unmarked > 0) {
      const ok = await confirmAsync({
        title: `${counts.unmarked} بلا تحضير`,
        message: "سيُحفظ تحضير الطالبات المحددات فقط، ويمكنكِ إكمال الباقيات لاحقاً.",
        confirmLabel: "حفظ المحدد",
      });
      if (!ok) return;
    }
    saveMutation.mutate();
  };

  const level = levelQuery.data;
  const name = subjectName(subjectIdx);
  const loadError = levelQuery.error ?? studentsQuery.error ?? sheetQuery.error;

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.dateRow}>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="اليوم السابق"
          variant="surface"
          onPress={() => shiftDay(-1)}
        />
        <View style={styles.flex}>
          <DateField
            label={`تاريخ التحضير — ${formatWeekday(parseDateKey(dateKey))}`}
            value={parseDateKey(dateKey)}
            onChange={(date) => void changeDate(formatAttendanceDate(date))}
            maximumDate={parseDateKey(todayKey)}
          />
        </View>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="اليوم التالي"
          variant="surface"
          disabled={dateKey >= todayKey}
          onPress={() => shiftDay(1)}
        />
      </View>
      {dateKey !== todayKey ? (
        <Button variant="ghost" size="sm" icon="calendar-today" onPress={() => void changeDate(todayKey)} style={styles.start}>
          العودة لليوم
        </Button>
      ) : null}

      {ready && students.length ? (
        <>
          <View style={styles.counts}>
            <Badge label={`حاضرة ${counts.present}`} tone="success" icon="check" />
            <Badge label={`متأخرة ${counts.late}`} tone="warning" icon="clock-outline" />
            <Badge label={`غائبة ${counts.absent}`} tone="danger" icon="close" />
            {counts.unmarked ? <Badge label={`بلا تحضير ${counts.unmarked}`} tone="neutral" /> : null}
          </View>
          <View style={styles.toolbar}>
            {counts.unmarked ? (
              <Button variant="tonal" size="sm" icon="check-all" onPress={markRemainingPresent}>
                {counts.unmarked === students.length ? "الكل حاضرات" : `الباقيات حاضرات (${counts.unmarked})`}
              </Button>
            ) : (
              <Badge label="اكتمل تحضير الجميع" tone="success" icon="check-circle" />
            )}
            {dirty ? (
              <Button variant="ghost" size="sm" icon="undo" onPress={() => setDraft({ ...baseline })}>
                تراجع
              </Button>
            ) : null}
          </View>
          {students.length > 8 ? (
            <SearchBar value={search} onChangeText={setSearch} placeholder="ابحثي بالاسم أو الرقم المدني" />
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<Header back={backHref} title={`تحضير ${name}`} subtitle={level?.shortName || level?.fullName} />}
      footer={
        students.length ? (
          <View style={styles.footer}>
            {dirty ? (
              <Text variant="caption" color="accentStrong" align="center">
                {`${changedIds.size} تعديل غير محفوظ`}
              </Text>
            ) : null}
            <Button
              fullWidth
              size="lg"
              icon="content-save-outline"
              onPress={() => void save()}
              loading={saveMutation.isPending}
              disabled={!ready || !dirty}
            >
              {dirty ? "حفظ التحضير" : "التحضير محفوظ"}
            </Button>
          </View>
        ) : null
      }
    >
      {loadError && !ready ? (
        <ErrorState
          message={(loadError as Error).message}
          onRetry={() => {
            void levelQuery.refetch();
            void studentsQuery.refetch();
            void sheetQuery.refetch();
          }}
        />
      ) : (
        <FlatList
          data={ready ? visible : []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={12}
          windowSize={7}
          ItemSeparatorComponent={Separator}
          refreshControl={
            <RefreshControl
              refreshing={studentsQuery.isRefetching}
              onRefresh={() => void studentsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            !ready ? (
              <SkeletonList rows={6} />
            ) : students.length === 0 ? (
              <EmptyState
                icon="account-group-outline"
                title="لا توجد طالبات في هذا المستوى"
                description="تظهر الطالبات المسجّلات في المستوى هنا لتحضيرهن"
              />
            ) : (
              <EmptyState compact icon="account-search-outline" title="لا نتائج مطابقة للبحث" />
            )
          }
          renderItem={({ item, index }) => (
            <AttendanceRow
              student={item}
              index={index}
              status={draft[item.id] ?? null}
              changed={changedIds.has(item.id)}
              onChange={setStatus}
            />
          )}
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBlock: { gap: space[3], paddingTop: space[2], paddingBottom: space[3] },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: space[2] },
  start: { alignSelf: "flex-start", marginTop: -space[2] },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] },
  listContent: { paddingHorizontal: layout.screenPadding, paddingBottom: space[6] },
  separator: { height: space[2] },
  footer: { gap: space[2] },
});
