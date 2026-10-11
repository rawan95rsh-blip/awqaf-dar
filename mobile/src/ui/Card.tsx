import { type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, motion, palette, radius, shadows, space, toneColors, type Tone } from "@/src/theme";

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: keyof typeof space;
  tone?: Tone | "surface";
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export default function Card({
  children,
  onPress,
  padding = 4,
  tone = "surface",
  elevated = false,
  style,
  accessibilityLabel,
  disabled,
}: CardProps) {
  const toneStyle =
    tone === "surface"
      ? { backgroundColor: colors.surface, borderColor: colors.border }
      : { backgroundColor: toneColors[tone].bg, borderColor: toneColors[tone].border };

  const base = [styles.card, toneStyle, { padding: space[padding] }, elevated && shadows.md, style];

  if (!onPress) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        base,
        pressed && styles.pressed,
        pressed && tone === "surface" && styles.pressedSurface,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    transform: [{ scale: motion.pressScale }],
  },
  pressedSurface: {
    backgroundColor: palette.sand50,
  },
});
