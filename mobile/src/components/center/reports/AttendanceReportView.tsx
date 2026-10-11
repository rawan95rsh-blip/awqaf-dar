import { StyleSheet, View } from "react-native";
import { colors, space, type Tone } from "@/src/theme";
import { Badge, Card, EmptyState, StatTile, Text } from "@/src/ui";
import type { AttendanceReport } from "@/src/api/reports";

type Row = AttendanceReport["rows"][number];

function percentTone(percent: number | null): Tone {
  if (percent == null) return "neutral";
  if (percent >= 85) return "success";
  if (percent >= 70) return "warning";
  return "danger";
}

function Count({ value, label, tone }: { value: number; label: string; tone: "success" | "danger" | "warning" }) {
  return (
    <Text variant="micro" color={value ? tone : "textMuted"} tabular>
      {`${label} ${value}`}
    </Text>
  );
}

function AttendanceRow({ row, last }: { row: Row; last: boolean }) {
  return (
    <View
      style={[styles.row, !last && styles.rowDivider]}
      accessible
      accessibilityLabel={`${row.fullName}: حضور ${row.present}، غياب ${row.absent}، تأخير ${row.late}${
        row.percent == null ? "" : `، النسبة ${row.percent}%`
      }`}
    >
      <Text variant="caption" color="textMuted" tabular style={styles.index}>
        {String(row.index)}
      </Text>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {row.fullName}
        </Text>
        <View style={styles.counts}>
          <Count value={row.present} label="حضور" tone="success" />
          <Count value={row.absent} label="غياب" tone="danger" />
          <Count value={row.late} label="تأخير" tone="warning" />
        </View>
      </View>
      <Badge label={row.percent == null ? "—" : `${row.percent}%`} tone={percentTone(row.percent)} />
    </View>
  );
}

/** معاينة كشف الغياب داخل التطبيق قبل التصدير */
export default function AttendanceReportView({ report }: { report: AttendanceReport }) {
  if (report.rows.length === 0) {
    return (
      <EmptyState
        icon="account-group-outline"
        title="لا توجد طالبات في هذا المستوى"
        description="أضيفي طالبات للمستوى أو اختاري مستوى آخر."
      />
    );
  }
  if (report.days.length === 0) {
    return (
      <EmptyState
        icon="calendar-blank-outline"
        title="لا يوجد تحضير في هذه الفترة"
        description="سجّلي الحضور من شاشة المادة أو الحصة، أو اختاري فترة أخرى."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.tiles}>
        <StatTile label="حضور" value={report.totals.present} icon="check-circle-outline" tone="success" />
        <StatTile label="غياب" value={report.totals.absent} icon="close-circle-outline" tone="danger" />
        <StatTile label="تأخير" value={report.totals.late} icon="clock-alert-outline" tone="warning" />
      </View>
      <Text variant="caption" color="textSecondary">
        {`${report.days.length} ${report.days.length === 1 ? "يوم دراسي" : "أيام دراسية"} · ${report.rows.length} طالبة · النسبة = (الحضور + التأخير) ÷ الأيام المسجّلة`}
      </Text>
      <Card padding={0} style={styles.list}>
        {report.rows.map((row, i) => (
          <AttendanceRow key={row.studentId} row={row} last={i === report.rows.length - 1} />
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
  counts: { flexDirection: "row", gap: space[3] },
});
