import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, forwardIcon, motion, radius, space, toneColors } from "@/src/theme";
import { Text } from "@/src/ui";
import type { LevelListItem } from "@/src/types/level";
import { studentsCountLabel } from "./helpers";

/** بطاقة مستوى في شبكة المستويات (عمودان) */
export default function LevelTile({ level, onPress }: { level: LevelListItem; onPress: () => void }) {
  const count = level.studentCount ?? 0;
  const tone = level.track === "preparatory" ? toneColors.accent : toneColors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${level.shortName} — ${studentsCountLabel(count)}`}
      accessibilityHint="يفتح صفحة الفصل: الجدول والطالبات والدرجات"
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={[styles.order, { backgroundColor: tone.bg }]}>
          <Text variant="bodyStrong" style={{ color: tone.fg }} tabular>
            {String(level.order)}
          </Text>
        </View>
        <MaterialCommunityIcons name={forwardIcon()} size={20} color={colors.textMuted} />
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>
        {level.shortName || level.fullName}
      </Text>
      <View style={styles.countRow}>
        <MaterialCommunityIcons
          name="account-multiple-outline"
          size={14}
          color={count ? colors.textSecondary : colors.textMuted}
        />
        <Text variant="caption" color={count ? "textSecondary" : "textMuted"} numberOfLines={1}>
          {studentsCountLabel(count)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken, transform: [{ scale: motion.pressScale }] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[2] },
  order: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  countRow: { flexDirection: "row", alignItems: "center", gap: 4 },
});
