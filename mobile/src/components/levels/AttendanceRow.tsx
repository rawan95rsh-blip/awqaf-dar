import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, space, toneColors, type Tone } from "@/src/theme";
import { Avatar, Text } from "@/src/ui";
import type { AttendanceStatus } from "@/src/types/attendance";
import type { StudentListItem } from "@/src/types/student";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const ATTENDANCE_OPTIONS: Array<{ id: AttendanceStatus; label: string; icon: IconName; tone: Tone }> = [
  { id: "present", label: "حاضرة", icon: "check", tone: "success" },
  { id: "late", label: "متأخرة", icon: "clock-outline", tone: "warning" },
  { id: "absent", label: "غائبة", icon: "close", tone: "danger" },
];

/** صف تحضير طالبة: ثلاثة أزرار متجاورة (حاضرة / متأخرة / غائبة) — الضغط على المحدد يلغيه */
function AttendanceRow({
  student,
  index,
  status,
  changed,
  onChange,
}: {
  student: StudentListItem;
  index: number;
  status: AttendanceStatus | null;
  changed: boolean;
  onChange: (studentId: string, status: AttendanceStatus | null) => void;
}) {
  return (
    <View style={[styles.row, status == null && styles.rowUnmarked]}>
      <View style={styles.identity}>
        <Text variant="micro" color="textMuted" tabular style={styles.index}>
          {String(index + 1)}
        </Text>
        <Avatar name={student.fullName} uri={student.photoUrl} size={36} tone={status ? toneFor(status) : "neutral"} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {student.fullName}
          </Text>
          <Text variant="micro" color="textMuted" tabular numberOfLines={1}>
            {`نسبة الحضور ${student.attendancePercent == null ? "—" : `${student.attendancePercent}%`}`}
          </Text>
        </View>
        {changed ? <View style={styles.changedDot} accessibilityLabel="تعديل غير محفوظ" /> : null}
      </View>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={`تحضير ${student.fullName}`}>
        {ATTENDANCE_OPTIONS.map((option) => {
          const on = status === option.id;
          const t = toneColors[option.tone];
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                onChange(student.id, on ? null : option.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${student.fullName}: ${option.label}`}
              hitSlop={{ top: 4, bottom: 4 }}
              style={({ pressed }) => [
                styles.option,
                on && { backgroundColor: t.fg, borderColor: t.fg },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons name={option.icon} size={16} color={on ? colors.onPrimary : t.fg} />
              <Text variant="label" style={{ color: on ? colors.onPrimary : colors.text }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function toneFor(status: AttendanceStatus): Tone {
  return ATTENDANCE_OPTIONS.find((o) => o.id === status)?.tone ?? "neutral";
}

export default memo(AttendanceRow);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  rowUnmarked: { borderColor: colors.borderStrong },
  identity: { flexDirection: "row", alignItems: "center", gap: space[2] },
  index: { minWidth: 18 },
  changedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  segment: { flexDirection: "row", gap: space[2] },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
