import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, motion, radius, space } from "@/src/theme";
import Text from "./Text";

export type ButtonVariant = "primary" | "secondary" | "tonal" | "ghost" | "danger" | "dangerTonal" | "accent";
export type ButtonSize = "sm" | "md" | "lg";
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: "start" | "end";
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

const VARIANTS: Record<ButtonVariant, { bg: string; bgPressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.onPrimary },
  accent: { bg: colors.accent, bgPressed: colors.accentStrong, fg: colors.onPrimary },
  secondary: { bg: colors.surface, bgPressed: colors.surfaceSunken, fg: colors.text, border: colors.borderStrong },
  tonal: { bg: colors.primarySoft, bgPressed: colors.primaryMuted, fg: colors.primary },
  ghost: { bg: "transparent", bgPressed: colors.surfaceSunken, fg: colors.primary },
  danger: { bg: colors.danger, bgPressed: "#93190F", fg: colors.onPrimary },
  dangerTonal: { bg: colors.dangerSoft, bgPressed: "#F8D5D1", fg: colors.danger },
};

const SIZES: Record<ButtonSize, { height: number; paddingH: number; icon: number; variant: "label" | "bodyStrong" }> = {
  sm: { height: 36, paddingH: space[3], icon: 16, variant: "label" },
  md: { height: 48, paddingH: space[5], icon: 18, variant: "bodyStrong" },
  lg: { height: 56, paddingH: space[6], icon: 20, variant: "bodyStrong" },
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  loading = false,
  disabled,
  fullWidth,
  style,
  haptic,
  onPress,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const shouldHaptic = haptic ?? (variant === "primary" || variant === "danger");

  const iconNode = icon ? <MaterialCommunityIcons name={icon} size={s.icon} color={v.fg} /> : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        if (shouldHaptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: pressed && !isDisabled ? v.bgPressed : v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? StyleSheet.hairlineWidth * 2 : 0,
          transform: [{ scale: pressed && !isDisabled ? motion.pressScale : 1 }],
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.content}>
          {iconPosition === "start" ? iconNode : null}
          {typeof children === "string" ? (
            <Text variant={s.variant} style={{ color: v.fg }} numberOfLines={1}>
              {children}
            </Text>
          ) : (
            children
          )}
          {iconPosition === "end" ? iconNode : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.45,
  },
});
