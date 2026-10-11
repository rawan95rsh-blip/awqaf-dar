import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useLocalSearchParams, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, layout, space } from "@/src/theme";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterBar,
  Header,
  IconButton,
  Screen,
  SearchBar,
  SkeletonList,
  Text,
  useToast,
} from "@/src/ui";
import GradeRow from "@/src/components/levels/GradeRow";
import GradeEditorSheet from "@/src/components/levels/GradeEditorSheet";
import { DEFAULT_WEIGHTS, WEIGHT_FIELDS, gradeLabel, gradeTone } from "@/src/components/levels/helpers";
import { useUnsavedChangesGuard } from "@/src/components/levels/useUnsavedChangesGuard";
import { fetchLevelById, fetchLevelStudents, levelQueryKeys } from "@/src/api/levels";
import { fetchGrades, gradesQueryKeys, saveGradesBulk } from "@/src/api/grades";
import { fetchGradeWeights, settingsQueryKeys } from "@/src/api/settings";
import { studentQueryKeys } from "@/src/api/students";
import { SUBJECT_NAMES, subjectName } from "@/src/constants/domain";
import type { GradeBreakdown } from "@/src/types/grades";
import { useAuth } from "@/src/context/AuthContext";
import { exportWorkbook } from "@/src/utils/excel";

type BreakdownMap = Record<string, GradeBreakdown>;
type Filter = "all" | "missing" | "changed";

const EMPTY: GradeBreakdown = { attendance: 0, shortExam: 0, participation: 0, final: 0 };

function totalOf(b: GradeBreakdown): number {
  return b.attendance + b.shortExam + b.participation + b.final;
}

function sameBreakdown(a?: GradeBreakdown, b?: GradeBreakdown): boolean {
  if (!a || !b) return a === b;
  return WEIGHT_FIELDS.every((f) => a[f.key] === b[f.key]);
}

/** سجل درجات مادة في مستوى — رصد سريع لكل الطالبات ثم حفظ واحد */
export default function GradesScreen() {
  const params = useLocalSearchParams<{ levelId: string; subjectIndex: string }>();
  const levelId = params.levelId ?? "";
  const parsed = Number.parseInt(params.subjectIndex ?? "0", 10);
  const subjectIdx = Number.isInteger(parsed) && parsed >= 0 && parsed < SUBJECT_NAMES.length ? parsed : 0;
  const name = subjectName(subjectIdx);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<BreakdownMap>({});
  const [baseline, setBaseline] = useState<BreakdownMap>({});
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  // قائمة ثابتة أثناء الرصد حتى لا تختفي الطالبة من الفلتر بمجرد تعديل درجتها
  const [queue, setQueue] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

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
  const gradesQuery = useQuery({
    queryKey: gradesQueryKeys.sheet(levelId, subjectIdx),
    queryFn: () => fetchGrades(levelId, subjectIdx),
    enabled: !!levelId,
  });
  // الخادم يتحقق من الدرجات مقابل أوزان المركز — نستخدم نفسها كحدود عليا
  const weightsQuery = useQuery({ queryKey: settingsQueryKeys.gradeWeights, queryFn: fetchGradeWeights });
  const weights = weightsQuery.data ?? DEFAULT_WEIGHTS;

  useEffect(() => {
    if (!gradesQuery.data || loaded) return;
    const map: BreakdownMap = {};
    for (const record of gradesQuery.data.records) map[record.studentId] = { ...record.breakdown };
    setDraft(map);
    setBaseline(map);
    setLoaded(true);
  }, [gradesQuery.data, loaded]);

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const changedIds = useMemo(
    () => new Set(students.filter((s) => !sameBreakdown(draft[s.id], baseline[s.id])).map((s) => s.id)),
    [students, draft, baseline]
  );
  const dirty = changedIds.size > 0;
  const ready = loaded && !studentsQuery.isLoading;

  const visible = useMemo(() => {
    const q = search.trim();
    return students.filter((s) => {
      if (q && !s.fullName.includes(q) && !s.idNumber.includes(q)) return false;
      if (filter === "missing") return !draft[s.id];
      if (filter === "changed") return changedIds.has(s.id);
      return true;
    });
  }, [students, search, filter, draft, changedIds]);

  const recorded = students.filter((s) => draft[s.id]);
  const subjectAverage = recorded.length
    ? Math.round((recorded.reduce((sum, s) => sum + totalOf(draft[s.id]), 0) / recorded.length) * 10) / 10
    : null;

  const saveMutation = useMutation({
    mutationFn: () =>
      saveGradesBulk({
        levelId,
        subjectIndex: subjectIdx,
        records: students
          .filter((s) => changedIds.has(s.id) && draft[s.id])
          .map((s) => ({ studentId: s.id, breakdown: draft[s.id] })),
      }),
    onSuccess: (result) => {
      setBaseline({ ...draft });
      void queryClient.invalidateQueries({ queryKey: gradesQueryKeys.sheet(levelId, subjectIdx) });
      void queryClient.invalidateQueries({ queryKey: levelQueryKeys.students(levelId) });
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["student-grades"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(result?.message || `تم حفظ درجات ${result?.savedCount ?? ""} طالبة`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useUnsavedChangesGuard(dirty && !saveMutation.isPending, "لم تُحفظ الدرجات بعد. هل تريدين الخروج دون حفظ؟");

  const openEditor = useCallback(
    (index: number) => {
      setQueue(visible.map((s) => s.id));
      setEditing(index);
    },
    [visible]
  );
  const editingStudent = editing != null ? students.find((s) => s.id === queue[editing]) ?? null : null;

  const updateBreakdown = (breakdown: GradeBreakdown) => {
    if (!editingStudent) return;
    setDraft((prev) => ({ ...prev, [editingStudent.id]: breakdown }));
  };

  const exportSubject = async () => {
    setExporting(true);
    try {
      const levelName = levelQuery.data?.shortName || levelQuery.data?.fullName || "";
      await exportWorkbook(
        [
          {
            name: name,
            title: `سجل درجات ${name} — ${levelName}`,
            subtitle: `${user?.centerProfile?.nameAr ?? ""} · ${WEIGHT_FIELDS.map((f) => `${f.label} ${weights[f.key]}`).join(" · ")}`,
            columns: [
              { header: "م", width: 5 },
              { header: "اسم الطالبة", width: 28 },
              { header: "الرقم المدني", width: 15 },
              ...WEIGHT_FIELDS.map((f) => ({ header: `${f.label} (${weights[f.key]})`, width: 13 })),
              { header: "المجموع", width: 9 },
              { header: "التقدير", width: 12 },
            ],
            rows: students.map((s, i) => {
              const b = baseline[s.id];
              return [
                i + 1,
                s.fullName,
                s.idNumber,
                ...WEIGHT_FIELDS.map((f) => (b ? b[f.key] : "")),
                b ? totalOf(b) : "",
                b ? gradeLabel(totalOf(b)) : "",
              ];
            }),
          },
        ],
        `درجات_${name}_${levelName}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر التصدير");
    } finally {
      setExporting(false);
    }
  };

  const loadError = levelQuery.error ?? studentsQuery.error ?? gradesQuery.error;
  const missingCount = students.length - recorded.length;

  const listHeader = ready && students.length ? (
    <View style={styles.headerBlock}>
      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="headline" tabular>{`${recorded.length}/${students.length}`}</Text>
            <Text variant="micro" color="textSecondary">مرصودة</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text variant="headline" tabular>
              {subjectAverage == null ? "—" : String(subjectAverage)}
            </Text>
            <Text variant="micro" color="textSecondary">متوسط المادة</Text>
          </View>
          {subjectAverage != null ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View>
                  <Badge label={gradeLabel(subjectAverage)} tone={gradeTone(subjectAverage)} />
                </View>
                <Text variant="micro" color="textSecondary">التقدير العام</Text>
              </View>
            </>
          ) : null}
        </View>
        <Text variant="caption" color="textMuted" align="center">
          {`التوزيع: ${WEIGHT_FIELDS.map((f) => `${f.short} ${weights[f.key]}`).join(" · ")}`}
        </Text>
      </Card>
      <FilterBar
        options={[
          { id: "all", label: "الكل", count: students.length },
          { id: "missing", label: "لم تُرصد", count: missingCount },
          { id: "changed", label: "غير محفوظة", count: changedIds.size },
        ]}
        value={filter}
        onChange={(value: Filter) => {
          setFilter(value);
          setEditing(null);
        }}
      />
      {students.length > 8 ? (
        <SearchBar value={search} onChangeText={setSearch} placeholder="ابحثي بالاسم أو الرقم المدني" />
      ) : null}
    </View>
  ) : null;

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <Header
          back={`/main/subject/${levelId}/${subjectIdx}` as Href}
          title={`درجات ${name}`}
          subtitle={levelQuery.data?.shortName || levelQuery.data?.fullName}
          actions={
            <IconButton
              icon="microsoft-excel"
              accessibilityLabel={exporting ? "جاري التصدير" : "تصدير درجات المادة Excel"}
              variant="surface"
              disabled={!ready || exporting || students.length === 0}
              onPress={() => void exportSubject()}
            />
          }
        />
      }
      footer={
        students.length ? (
          <View style={styles.footer}>
            {dirty ? (
              <Text variant="caption" color="accentStrong" align="center">
                {`درجات ${changedIds.size} طالبة لم تُحفظ بعد`}
              </Text>
            ) : null}
            <Button
              fullWidth
              size="lg"
              icon="content-save-outline"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!ready || !dirty}
            >
              {dirty ? `حفظ الدرجات (${changedIds.size})` : "الدرجات محفوظة"}
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
            void gradesQuery.refetch();
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
                description="تظهر الطالبات المسجّلات في المستوى هنا لرصد درجاتهن"
              />
            ) : (
              <EmptyState
                compact
                icon={filter === "missing" ? "check-all" : "account-search-outline"}
                title={filter === "missing" ? "رُصدت درجات الجميع" : filter === "changed" ? "لا تعديلات غير محفوظة" : "لا نتائج مطابقة"}
              />
            )
          }
          renderItem={({ item, index }) => (
            <GradeRow
              student={item}
              index={index}
              breakdown={draft[item.id] ?? null}
              changed={changedIds.has(item.id)}
              onPress={openEditor}
            />
          )}
        />
      )}

      <GradeEditorSheet
        student={editingStudent}
        position={editing != null ? `${editing + 1} من ${queue.length} · ${name}` : ""}
        breakdown={editingStudent ? draft[editingStudent.id] ?? EMPTY : EMPTY}
        weights={weights}
        onChange={updateBreakdown}
        onPrev={editing != null && editing > 0 ? () => setEditing(editing - 1) : undefined}
        onNext={editing != null && editing < queue.length - 1 ? () => setEditing(editing + 1) : undefined}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  headerBlock: { gap: space[3], paddingTop: space[2], paddingBottom: space[3] },
  summary: { gap: space[3] },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.divider },
  listContent: { paddingHorizontal: layout.screenPadding, paddingBottom: space[6] },
  separator: { height: space[2] },
  footer: { gap: space[2] },
});
