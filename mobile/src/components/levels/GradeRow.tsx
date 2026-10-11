import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/src/theme";
import { Avatar, Badge, Text } from "@/src/ui";
import type { GradeBreakdown } from "@/src/types/grades";
import type { StudentListItem } from "@/src/types/student";
import { WEIGHT_FIELDS, gradeLabel, gradeTone } from "./helpers";

/** صف درجات طالبة: تفاصيل البنود الأربعة + المجموع والتقدير — يفتح لوحة الرصد */
function GradeRow({
  student,
  index,
  breakdown,
  changed,
  onPress,
}: {
  student: StudentListItem;
  index: number;
  breakdown: GradeBreakdown | null;
  changed: boolean;
  onPress: (index: number) => void;
}) {
  const total = breakdown
    ? breakdown.attendance + breakdown.shortExam + breakdown.participation + breakdown.final
    : null;
  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={`${student.fullName} — ${total == null ? "لم تُرصد" : `المجموع ${total} ${gradeLabel(total)}`}`}
      accessibilityHint="يفتح رصد الدرجات"
      style={({ pressed }) => [styles.row, changed && styles.rowChanged, pressed && styles.pressed]}
    >
      <Avatar name={student.fullName} uri={student.photoUrl} size={40} tone={gradeTone(total)} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
            {student.fullName}
          </Text>
          {changed ? <Badge label="غير محفوظ" tone="accent" size="sm" /> : null}
        </View>
        {breakdown ? (
          <Text variant="micro" color="textSecondary" tabular numberOfLines={1}>
            {WEIGHT_FIELDS.map((f) => `${f.short} ${breakdown[f.key]}`).join(" · ")}
          </Text>
        ) : (
          <Text variant="micro" color="textMuted">
            لم تُرصد درجاتها — اضغطي للرصد
          </Text>
        )}
      </View>
      <View style={styles.total}>
        <Text variant="headline" tabular color={total == null ? "textMuted" : "text"}>
          {total == null ? "—" : String(total)}
        </Text>
        {total != null ? (
          <View>
            <Badge label={gradeLabel(total)} tone={gradeTone(total)} size="sm" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(GradeRow);

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
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
  rowChanged: { borderColor: colors.accent },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: 0.99 }] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  total: { alignItems: "center", minWidth: 56, gap: 2 },
});
