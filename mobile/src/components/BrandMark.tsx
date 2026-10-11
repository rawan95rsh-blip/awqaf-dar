import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, shadows } from "@/src/theme";

/** شعار التطبيق: مصحف مفتوح داخل إطار زمردي مع حلقة ذهبية */
export default function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size + 16, height: size + 16, borderRadius: (size + 16) * 0.32 }]}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <MaterialCommunityIcons name="book-open-page-variant" size={size * 0.52} color={colors.onPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
  },
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    ...shadows.md,
  },
});
