import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/src/theme";
import Text from "./Text";

/** مؤشر خطوات للنماذج الطويلة */
export default function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.wrap} accessibilityLabel={`الخطوة ${current + 1} من ${steps.length}: ${steps[current]}`}>
      <View style={styles.bars}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.bar,
              index < current && styles.barDone,
              index === current && styles.barActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <Text variant="eyebrow" color="accentStrong">
          {`الخطوة ${current + 1} من ${steps.length}`}
        </Text>
        <Text variant="caption" color="textSecondary">
          {steps[current]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  bars: { flexDirection: "row", gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
  barDone: { backgroundColor: colors.primaryMuted },
  barActive: { backgroundColor: colors.primary },
  labels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
