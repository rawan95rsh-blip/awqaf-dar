import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius, space } from "@/src/theme";
import { Badge, Button, Card, ErrorState, Skeleton, Text, useToast } from "@/src/ui";
import { fetchGradesheet, reportQueryKeys, type Gradesheet } from "@/src/api/reports";
import { exportWorkbook, gradesheetSheets } from "@/src/utils/excel";
import type { LevelTrack } from "@/src/constants/domain";
import { gradeLabel, gradeTone } from "./helpers";

function summarize(sheet: Gradesheet | undefined) {
  const rows = sheet?.rows ?? [];
  const averages = rows.map((r) => r.average).filter((v): v is number => v != null);
  const classAverage = averages.length
    ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10
    : null;
  return {
    total: rows.length,
    complete: rows.filter((r) => r.complete).length,
    started: rows.filter((r) => r.recordedCount > 0).length,
    failing: rows.filter((r) => r.average != null && r.average < 60).length,
    classAverage,
  };
}

/**
 * «كشف الدرجات الشامل» — معاينة داخل التطبيق (اكتمال الرصد ومعدل الفصل) + تصدير Excel
 * (كل الطالبات × المواد السبع، مع ورقة تفصيلية لكل مادة).
 */
export default function GradesheetCard({
  levelId,
  levelName,
  track,
  centerName,
}: {
  levelId: string;
  levelName: string;
  track: LevelTrack;
  centerName: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const isFinal = track === "mutor";

  const query = useQuery({
    queryKey: reportQueryKeys.gradesheet(levelId),
    queryFn: () => fetchGradesheet(levelId),
    enabled: !!levelId,
  });

  const stats = useMemo(() => summarize(query.data), [query.data]);
  const completion = stats.total ? stats.complete / stats.total : 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      // نسخة حديثة دائماً قبل التصدير (قد تكون المعلمات رصدن درجات للتو)
      const sheet = await queryClient.fetchQuery({
        queryKey: reportQueryKeys.gradesheet(levelId),
        queryFn: () => fetchGradesheet(levelId),
        staleTime: 0,
      });
      if (!sheet.rows.length) {
        toast.error("لا توجد طالبات في هذا المستوى لتصدير كشفهن");
        return;
      }
      const prefix = isFinal ? "كشف_الدرجات_النهائي" : "كشف_الدرجات";
      await exportWorkbook(gradesheetSheets(sheet, centerName), `${prefix}_${levelName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تصدير الكشف");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="file-table-outline" size={22} color={colors.accentStrong} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">{isFinal ? "كشف الدرجات النهائي الشامل" : "كشف الدرجات الشامل"}</Text>
          <Text variant="caption" color="textSecondary">
            كل الطالبات × المواد السبع — الدرجة من 100 لكل مادة
          </Text>
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.skeleton}>
          <Skeleton height={14} width="70%" />
          <Skeleton height={8} radiusSize={radius.pill} />
          <Skeleton height={14} width="45%" />
        </View>
      ) : query.isError ? (
        <ErrorState compact message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : stats.total === 0 ? (
        <Text variant="body" color="textSecondary">
          لا توجد طالبات مسجّلات في هذا المستوى بعد.
        </Text>
      ) : (
        <View style={styles.preview}>
          <View style={styles.metrics}>
            <Metric
              label="اكتمل رصدها"
              value={`${stats.complete}/${stats.total}`}
              hint={stats.started > stats.complete ? `${stats.started - stats.complete} قيد الرصد` : undefined}
            />
            <View style={styles.metricDivider} />
            <Metric
              label="معدل الفصل"
              value={stats.classAverage == null ? "—" : String(stats.classAverage)}
              badge={stats.classAverage == null ? undefined : gradeLabel(stats.classAverage)}
              badgeTone={gradeTone(stats.classAverage)}
            />
            <View style={styles.metricDivider} />
            <Metric label="دون 60" value={String(stats.failing)} danger={stats.failing > 0} />
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel={`اكتمل رصد درجات ${stats.complete} من ${stats.total} طالبة`}
            accessibilityValue={{ min: 0, max: stats.total, now: stats.complete }}
          >
            <View style={[styles.fill, { width: `${Math.round(completion * 100)}%` }]} />
          </View>
          <Text variant="caption" color="textSecondary">
            {stats.complete === stats.total
              ? "اكتمل رصد المواد السبع لجميع الطالبات"
              : "الخانات غير المرصودة تظهر فارغة في الكشف"}
          </Text>
        </View>
      )}

      <Button
        variant="accent"
        icon="microsoft-excel"
        loading={exporting}
        disabled={query.isLoading || stats.total === 0}
        onPress={handleExport}
        fullWidth
      >
        {isFinal ? "كشف الدرجات النهائي الشامل (Excel)" : "كشف الدرجات الشامل (Excel)"}
      </Button>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  badge,
  badgeTone,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: string;
  badgeTone?: ReturnType<typeof gradeTone>;
  danger?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text variant="headline" tabular color={danger ? "danger" : "text"}>
        {value}
      </Text>
      <Text variant="micro" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View>
          <Badge label={badge} tone={badgeTone} size="sm" />
        </View>
      ) : null}
      {hint ? (
        <Text variant="micro" color="accentStrong" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[4] },
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  skeleton: { gap: space[2] },
  preview: { gap: space[3] },
  metrics: { flexDirection: "row", alignItems: "flex-start" },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.divider },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
});
