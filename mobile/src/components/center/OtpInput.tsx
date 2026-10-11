import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, fonts, radius, space } from "@/src/theme";
import { Text } from "@/src/ui";
import { toLatinDigits } from "@/src/constants/phone";

export type OtpInputHandle = { focus: () => void; blur: () => void };

type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** يُستدعى تلقائياً عند اكتمال الأرقام */
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * رمز تحقق بخانات كبيرة — حقل نص واحد مخفي خلف الخانات
 * (يدعم اللصق والتعبئة التلقائية من الرسائل). الأرقام تُقرأ دائماً من اليسار.
 */
const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, length = 4, error, disabled, autoFocus = true },
  ref
) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const handleChange = (text: string) => {
    const digits = toLatinDigits(text).slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      disabled={disabled}
      accessibilityRole="none"
      accessibilityLabel={`رمز التحقق — ${value.length} من ${length} أرقام`}
      style={styles.wrap}
    >
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? "";
          const isActive = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                !!char && styles.boxFilled,
                isActive && styles.boxActive,
                error && styles.boxError,
                disabled && styles.boxDisabled,
              ]}
            >
              <Text variant="title" tabular style={styles.char}>
                {char}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        accessibilityLabel="أدخلي رمز التحقق"
        style={styles.hidden}
      />
    </Pressable>
  );
});

export default OtpInput;

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  row: { flexDirection: Platform.OS === "web" ? "row-reverse" : "row", justifyContent: "center", gap: space[3], ...(Platform.OS === "web" ? {} : { direction: "ltr" as const }) },
  box: {
    width: 64,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: { borderColor: colors.primaryMuted, backgroundColor: colors.primarySoft },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  boxDisabled: { opacity: 0.6 },
  char: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 40 },
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
