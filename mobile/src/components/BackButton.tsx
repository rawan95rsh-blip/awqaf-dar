import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { centerColors, spacing } from "@/constants";

export default function BackButton() {
  const router = useRouter();

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.replace("/main" as import("expo-router").Href)}
      accessibilityLabel="عودة"
    >
      <MaterialCommunityIcons
        name="arrow-right"
        size={22}
        color={centerColors.text}
      />
      <Text style={styles.label}>عودة</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: centerColors.text,
  },
});
