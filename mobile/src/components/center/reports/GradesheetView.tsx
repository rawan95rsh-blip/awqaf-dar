import { StyleSheet, View } from "react-native";
import { colors, space, type Tone } from "@/src/theme";
import { Badge, Banner, Card, EmptyState, StatTile, Text } from "@/src/ui";
import type { Gradesheet, GradesheetRow } from "@/src/api/reports";

function averageTone(average: number | null): Tone {
  if (average == null) return "neutral";
  if (average >= 90) return "accent";
  if (average >= 60) return "success";
  return "danger";
}

function GradeRow({ row, subjectCount, last }: { row: GradesheetRow; subjectCount: number; last: boolean }) {
  const recorded = `${row.recordedCount}/${subjectCount} مواد مرصودة`;
  return (
    <View
      style={[styles.row, !last && styles.rowDivider]}
      accessible
      accessibilityLabel={`${row.fullName}: ${row.average == null ? "لا يوجد معدل" : `المعدل ${row.average}`}، ${recorded}`}
    >
      <Text variant="caption" color="textMuted" tabular style={styles.index}>
        {String(row.index)}
      </Text>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {row.fullName}
        </Text>
        <Text variant="micro" color={row.complete ? "success" : "textMuted"}>
          {recorded}
        </Text>
      </View>
      <View style={styles.score}>
        <Text variant="headline" tabular>
          {row.average == null ? "—" : String(row.average)}
        </Text>
        {row.label ? <Badge label={row.label} tone={averageTone(row.average)} size="sm" /> : null}
      </View>
    </View>
  );
}

/** معاينة كشف الدرجات الشامل (فورمة واحدة لجميع المواد) */
export default function GradesheetView({ sheet }: { sheet: Gradesheet }) {
  if (sheet.rows.length === 0) {
    return (
      <EmptyState
        icon="account-group-outline"
        title="لا توجد طالبات في هذا المستوى"
        description="أضيفي طالبات للمستوى أو اختاري مستوى آخر."
      />
    );
  }

  const subjectCount = sheet.subjects.length;
  const averages = sheet.rows.map((r) => r.average).filter((a): a is number => a != null);
  const levelAverage = averages.length ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length) : null;
  const completeCount = sheet.rows.filter((r) => r.complete).length;
  const noGrades = sheet.rows.filter((r) => r.recordedCount === 0).length;

  return (
    <View style={styles.wrap}>
      {sheet.isFinal ? (
        <Banner tone="success" title="كشف نهائي">
          رُصدت درجات جميع المواد لكل الطالبات.
        </Banner>
      ) : (
        <Banner tone="warning" title="كشف مبدئي">
          {`بعض الدرجات لم تُرصد بعد — ${sheet.rows.length - completeCount} طالبة بحاجة لاستكمال الرصد.`}
        </Banner>
      )}
      <View style={styles.tiles}>
        <StatTile label="معدل المستوى" value={levelAverage ?? "—"} icon="chart-line" tone="accent" />
        <StatTile label="مكتملة الرصد" value={`${completeCount}/${sheet.rows.length}`} icon="check-all" tone="success" />
        <StatTile label="بلا درجات" value={noGrades} icon="clipboard-alert-outline" tone={noGrades ? "warning" : "neutral"} />
      </View>
      <Text variant="caption" color="textSecondary">
        {`المواد: ${sheet.subjects.map((s) => s.name).join("، ")} — الدرجة من 100 لكل مادة`}
      </Text>
      <Card padding={0} style={styles.list}>
        {sheet.rows.map((row, i) => (
          <GradeRow key={row.studentId} row={row} subjectCount={subjectCount} last={i === sheet.rows.length - 1} />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: space[3] },
  tiles: { flexDirection: "row", gap: space[3] },
  list: { overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  index: { minWidth: 20 },
  score: { alignItems: "center", gap: 2, minWidth: 56 },
});
