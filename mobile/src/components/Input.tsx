import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { colors, spacing } from "@/constants";

export interface InputProps extends Pick<
  TextInputProps,
  | "value"
  | "onChangeText"
  | "placeholder"
  | "secureTextEntry"
  | "editable"
  | "keyboardType"
  | "autoComplete"
  | "accessibilityLabel"
> {
  error?: string;
  label?: string;
  required?: boolean;
}

export default function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  editable = true,
  keyboardType,
  autoComplete,
  accessibilityLabel,
  label,
  required,
}: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        editable={editable}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !editable }}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? (
        <Text
          style={styles.errorText}
          accessibilityLabel={
            accessibilityLabel ? `${accessibilityLabel} error` : undefined
          }
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
  },
});
