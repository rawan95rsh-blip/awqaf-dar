import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, motion, radius, space, toneColors, type Tone } from "@/src/theme";
import { Skeleton, Text } from "@/src/ui";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** بطاقة إجراء رئيسية مع مؤشر تقدّم (التحضير / الدرجات) */
export default function HubActionCard({
  icon,
  title,
  status,
  progress,
  tone = "primary",
  loading,
  onPress,
}: {
  icon: IconName;
  title: string;
  status: string;
  /** من 0 إلى 1 */
  progress: number | null;
  tone?: Tone;
  loading?: boolean;
  onPress: () => void;
}) {
  const t = toneColors[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${status}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={icon} size={26} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text variant="headline">{title}</Text>
        {loading ? (
          <Skeleton height={12} width="60%" />
        ) : (
          <Text variant="caption" color="textSecondary">
            {status}
          </Text>
        )}
        {progress != null && !loading ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(Math.min(progress, 1) * 100)}%`, backgroundColor: t.fg }]} />
          </View>
        ) : null}
      </View>
      <MaterialCommunityIcons name={forwardIcon()} size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: motion.pressScale }] },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  track: {
    height: 6,
    marginTop: space[1],
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
});
