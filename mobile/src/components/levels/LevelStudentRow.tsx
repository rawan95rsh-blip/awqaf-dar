import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, space } from "@/src/theme";
import { Avatar, Badge, Text } from "@/src/ui";
import { PERFORMANCE } from "@/src/constants/domain";
import type { StudentListItem } from "@/src/types/student";

/** صف طالبة في «قائمة الطالبات» داخل صفحة المستوى — يفتح ملفها */
function LevelStudentRow({
  student,
  index,
  onPress,
  divider,
}: {
  student: StudentListItem;
  index: number;
  onPress: () => void;
  divider: boolean;
}) {
  const perf = PERFORMANCE[student.status] ?? PERFORMANCE.regular;
  const lowAttendance = student.attendancePercent != null && student.attendancePercent < 70;
  const lowGrade = student.gradeAverage != null && student.gradeAverage < 60;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${student.fullName} — حضور ${student.attendancePercent ?? "غير مسجل"}، معدل ${student.gradeAverage ?? "غير مسجل"}`}
      accessibilityHint="يفتح ملف الطالبة"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <Text variant="micro" color="textMuted" tabular style={styles.index}>
        {String(index + 1)}
      </Text>
      <Avatar name={student.fullName} uri={student.photoUrl} size={40} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {student.fullName}
        </Text>
        <View style={styles.meta}>
          <Badge label={perf.label} tone={perf.tone} icon={perf.icon} size="sm" />
          {student.studentType === "new" ? <Badge label="مستجدة" tone="info" size="sm" /> : null}
        </View>
      </View>
      <Metric label="حضور" value={student.attendancePercent == null ? "—" : `${student.attendancePercent}%`} danger={lowAttendance} />
      <Metric label="معدل" value={student.gradeAverage == null ? "—" : String(student.gradeAverage)} danger={lowGrade} />
      <MaterialCommunityIcons name={forwardIcon()} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger: boolean }) {
  return (
    <View style={styles.metric}>
      <Text variant="bodyStrong" tabular color={danger ? "danger" : "text"}>
        {value}
      </Text>
      <Text variant="micro" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

export default memo(LevelStudentRow);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    backgroundColor: colors.surface,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  pressed: { backgroundColor: colors.surfaceSunken },
  index: { minWidth: 18 },
  meta: { flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" },
  metric: { alignItems: "center", minWidth: 44 },
});
