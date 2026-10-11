import { forwardRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, fonts, radius, space } from "@/src/theme";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  icon?: IconName;
  /** عنصر داخل الحقل قبل النص (مثل مفتاح الدولة) */
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** محاذاة أرقام (الهاتف / الرقم المدني) من اليسار لسهولة القراءة */
  ltr?: boolean;
  showCounter?: boolean;
};

const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    required,
    hint,
    error,
    icon,
    prefix,
    suffix,
    containerStyle,
    secureTextEntry,
    multiline,
    editable = true,
    ltr,
    showCounter,
    maxLength,
    value,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecure = !!secureTextEntry;

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="label" color="text">
            {label}
            {required ? <Text variant="label" color="danger">{" *"}</Text> : null}
          </Text>
          {showCounter && maxLength ? (
            <Text variant="micro" color="textMuted" tabular>
              {`${value?.length ?? 0}/${maxLength}`}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          { borderColor },
          focused && !error && styles.fieldFocused,
          multiline && styles.fieldMultiline,
          !editable && styles.fieldDisabled,
          ltr && styles.fieldLtr,
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={focused ? colors.primary : colors.textMuted}
          />
        ) : null}
        {prefix}
        <TextInput
          ref={ref}
          value={value}
          editable={editable}
          maxLength={maxLength}
          multiline={multiline}
          secureTextEntry={isSecure && hidden}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            ltr && styles.inputLtr,
          ]}
          textAlignVertical={multiline ? "top" : "center"}
          {...rest}
        />
        {suffix}
        {isSecure ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "إظهار كلمة المرور" : "إخفاء كلمة المرور"}
          >
            <MaterialCommunityIcons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} />
          <Text variant="caption" color="danger" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export default TextField;

export const fieldStyles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: 52,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  field: fieldStyles.field,
  fieldFocused: {
    backgroundColor: colors.surface,
  },
  fieldMultiline: {
    alignItems: "flex-start",
    paddingVertical: space[3],
  },
  fieldDisabled: {
    backgroundColor: colors.surfaceSunken,
  },
  /** الأرقام (هاتف / رقم مدني) تُقرأ من اليسار مع بقاء العنوان عربياً */
  fieldLtr: Platform.select({ web: {}, default: { direction: "ltr" } }) as object,
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: space[3],
  },
  inputMultiline: {
    minHeight: 96,
    paddingVertical: 0,
  },
  inputLtr: {
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  messageRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hint: {},
});
