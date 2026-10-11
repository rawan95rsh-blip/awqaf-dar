import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, fonts, radius, space } from "@/src/theme";
import { IconButton, Text } from "@/src/ui";
import { toLatinDigits } from "@/src/constants/phone";

type WeightStepperProps = {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** عدّاد رقمي: − [قيمة قابلة للكتابة] + — بديل واضح للمنزلقات */
export default function WeightStepper({
  label,
  hint,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 5,
  disabled,
}: WeightStepperProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(toLatinDigits(raw), 10);
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value;
    setText(String(next));
    if (next !== value) onChange(next);
  };

  const nudge = (delta: number) => {
    // القفز لأقرب مضاعف للخطوة يجعل الأرقام «نظيفة» (15 → 20 لا 15 → 20.5)
    const base = delta > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step;
    onChange(clamp(base, min, max));
  };

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textSecondary">
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="minus"
          variant="surface"
          size={18}
          accessibilityLabel={`إنقاص ${label}`}
          onPress={() => nudge(-1)}
          disabled={disabled || value <= min}
        />
        <TextInput
          value={text}
          onChangeText={(t) => setText(toLatinDigits(t).slice(0, 3))}
          onBlur={() => commit(text)}
          onSubmitEditing={() => commit(text)}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={3}
          editable={!disabled}
          selectTextOnFocus
          accessibilityLabel={`${label} — القيمة ${value}`}
          style={styles.input}
          selectionColor={colors.primary}
        />
        <IconButton
          icon="plus"
          variant="surface"
          size={18}
          accessibilityLabel={`زيادة ${label}`}
          onPress={() => nudge(1)}
          disabled={disabled || value >= max}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2] },
  controls: { flexDirection: "row", alignItems: "center", gap: space[2] },
  input: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
