import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, centerColors } from "@/constants";
import type { SelectOption } from "@/src/constants/registrationOptions";

export interface SelectFieldProps {
  label: string;
  required?: boolean;
  value: string | null;
  options: SelectOption[];
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  accessibilityLabel?: string;
}

export default function SelectField({
  label,
  required = false,
  value,
  options,
  onSelect,
  placeholder = "اختر",
  disabled = false,
  error,
  accessibilityLabel,
}: SelectFieldProps) {
  const [visible, setVisible] = useState(false);

  const selectedLabel = options.find((option) => option.id === value)?.label;

  const handleSelect = (id: string) => {
    onSelect(id);
    setVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          error ? styles.triggerError : null,
        ]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedLabel && styles.placeholderText,
            disabled && styles.triggerTextDisabled,
          ]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={disabled ? colors.textSecondary : centerColors.textSecondary}
        />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(option.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    backgroundColor: colors.background,
  },
  triggerDisabled: {
    backgroundColor: centerColors.surfaceMuted,
    opacity: 0.85,
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
  },
  triggerTextDisabled: {
    color: colors.textSecondary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.error,
    textAlign: "right",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  modalScroll: {
    maxHeight: 360,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: centerColors.surfaceMuted,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
});
