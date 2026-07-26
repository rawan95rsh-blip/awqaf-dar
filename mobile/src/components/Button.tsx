import React, { ReactNode } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors, spacing } from "@/constants";

export interface ButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  accessibilityLabel?: string;
  variant?: "contained" | "outlined";
  /** لون الخلفية عند variant=contained (مثلاً للأخضر) */
  backgroundColor?: string;
}

export default function Button({
  onPress,
  loading = false,
  disabled = false,
  children,
  accessibilityLabel,
  variant = "contained",
  backgroundColor,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const containedStyle =
    backgroundColor && variant === "contained"
      ? [styles.contained, { backgroundColor }]
      : styles.contained;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === "contained" ? containedStyle : styles.outlined,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "contained" ? colors.background : colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "outlined" ? styles.textOutlined : styles.textContained,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
  },
  contained: {
    backgroundColor: colors.primaryDark,
  },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  textContained: {
    color: colors.background,
  },
  textOutlined: {
    color: colors.primary,
  },
});
