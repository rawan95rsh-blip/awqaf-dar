import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/src/theme";
import { Text } from "@/src/ui";
import type { AttendanceCalendarDay } from "@/src/types/student";

const HEADERS = ["أح", "إث", "ث", "أر", "خ", "ج", "س"];

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  present: { bg: colors.success, fg: colors.onPrimary, label: "حاضرة" },
  late: { bg: colors.accent, fg: colors.onPrimary, label: "متأخرة" },
  absent: { bg: colors.danger, fg: colors.onPrimary, label: "غائبة" },
};

/**
 * تقويم الحضور لآخر 30 يوماً — الأيام محاذاة لأعمدة الأسبوع الصحيحة
 * (كان التقويم القديم يبدأ من أي يوم تحت عمود «الأحد»).
 */
export default function AttendanceCalendar({ days }: { days: AttendanceCalendarDay[] }) {
  if (!days.length) return null;
  const firstWeekday = new Date(`${days[0].date}T00:00:00`).getDay();
  const cells: Array<AttendanceCalendarDay | null> = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {HEADERS.map((h) => (
          <View key={h} style={styles.cell}>
            <Text variant="micro" color="textMuted" align="center">
              {h}
            </Text>
          </View>
        ))}
        {cells.map((day, i) => {
          const s = day?.status ? STATUS_STYLE[day.status] : null;
          return (
            <View key={day?.date ?? `pad-${i}`} style={styles.cell}>
              {day ? (
                <View
                  style={[styles.dayBox, s ? { backgroundColor: s.bg } : styles.dayEmpty]}
                  accessibilityLabel={`${day.date}: ${s?.label ?? "لا تحضير"}`}
                >
                  <Text variant="micro" style={{ color: s ? s.fg : colors.textMuted }} tabular>
                    {String(Number(day.date.slice(8, 10)))}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {Object.values(STATUS_STYLE).map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.bg }]} />
            <Text variant="micro" color="textSecondary">
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3, alignItems: "center", justifyContent: "center" },
  dayBox: { flex: 1, alignSelf: "stretch", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  dayEmpty: { backgroundColor: colors.surfaceSunken },
  legend: { flexDirection: "row", gap: space[4], justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
