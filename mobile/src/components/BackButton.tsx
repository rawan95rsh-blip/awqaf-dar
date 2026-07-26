import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { centerColors, spacing } from "@/constants";
import { goBack } from "@/src/utils/navigation";

type BackButtonProps = {
  label?: string;
  fallback?: Href;
};

export default function BackButton({
  label = "عودة",
  fallback = "/main" as Href,
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.button}
      onPress={() => goBack(router, fallback)}
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name="arrow-right"
        size={22}
        color={centerColors.text}
      />
      <Text style={styles.label}>{label}</Text>
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
