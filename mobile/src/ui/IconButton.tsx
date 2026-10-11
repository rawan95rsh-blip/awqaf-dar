import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, layout, radius } from "@/src/theme";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type IconButtonProps = Omit<PressableProps, "style" | "children"> & {
  icon: IconName;
  accessibilityLabel: string;
  variant?: "plain" | "surface" | "tonal" | "primary";
  size?: number;
  color?: string;
  badge?: number;
  style?: StyleProp<ViewStyle>;
};

export default function IconButton({
  icon,
  variant = "plain",
  size = 22,
  color,
  badge,
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  const fg =
    color ?? (variant === "primary" ? colors.onPrimary : variant === "tonal" ? colors.primary : colors.text);
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={layout.hitSlop}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "surface" && styles.surface,
        variant === "tonal" && styles.tonal,
        variant === "primary" && styles.primary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <MaterialCommunityIcons name={icon} size={size} color={fg} />
      {badge ? (
        <View style={styles.badge}>
          <Text variant="micro" style={styles.badgeText}>
            {badge > 99 ? "99+" : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  tonal: { backgroundColor: colors.primarySoft },
  primary: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: 4,
    end: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { color: colors.onPrimary, fontSize: 10, lineHeight: 12 },
});
