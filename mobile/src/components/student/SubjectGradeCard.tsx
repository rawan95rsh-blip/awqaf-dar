import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space, toneColors, type Tone } from "@/src/theme";
import { Badge, Card, Text } from "@/src/ui";
import { SUBJECT_ICONS, subjectName } from "@/src/constants/domain";
import type { GradeBreakdown } from "@/src/types/grades";

const BREAKDOWN_LABELS: Array<{ key: keyof GradeBreakdown; label: string }> = [
  { key: "attendance", label: "الحضور" },
  { key: "shortExam", label: "اختبار قصير" },
  { key: "participation", label: "المشاركة" },
  { key: "final", label: "النهائي" },
];

/** لون التقدير — مطابق لسلّم التقديرات (ممتاز ≥ 90 … راسب < 60) */
export function gradeTone(total: number): Tone {
  if (total >= 90) return "accent";
  if (total >= 80) return "success";
  if (total >= 70) return "info";
  if (total >= 60) return "warning";
  return "danger";
}

export default function SubjectGradeCard({
  subjectIndex,
  total,
  label,
  breakdown,
}: {
  subjectIndex: number;
  total: number;
  label: string;
  breakdown: GradeBreakdown;
}) {
  const tone = gradeTone(total);
  const t = toneColors[tone];
  const name = subjectName(subjectIndex);
  const clamped = Math.max(0, Math.min(100, total));

  return (
    <Card padding={4} style={styles.card}>
      <View
        style={styles.top}
        accessible
        accessibilityLabel={`${name}: ${total} من 100، ${label}`}
      >
        <View style={[styles.icon, { backgroundColor: t.bg }]}>
          <MaterialCommunityIcons name={SUBJECT_ICONS[subjectIndex] ?? "book-outline"} size={20} color={t.fg} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{name}</Text>
          <Badge label={label} tone={tone} size="sm" />
        </View>
        <View style={styles.total}>
          <Text variant="number" tabular>
            {String(total)}
          </Text>
          <Text variant="micro" color="textMuted">
            من 100
          </Text>
        </View>
      </View>

      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: t.fg }]} />
      </View>

      <View style={styles.breakdown}>
        {BREAKDOWN_LABELS.map(({ key, label: partLabel }) => (
          <View key={key} style={styles.part} accessible accessibilityLabel={`${partLabel}: ${breakdown[key]}`}>
            <Text variant="bodyStrong" tabular align="center">
              {String(breakdown[key])}
            </Text>
            <Text variant="micro" color="textSecondary" align="center" numberOfLines={1}>
              {partLabel}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space[1] },
  card: { gap: space[3] },
  top: { flexDirection: "row", alignItems: "center", gap: space[3] },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  total: { alignItems: "center", minWidth: 56 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  breakdown: { flexDirection: "row", gap: space[2] },
  part: {
    flex: 1,
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
});
