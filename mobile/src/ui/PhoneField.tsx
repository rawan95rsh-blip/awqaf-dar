import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import { PHONE_COUNTRIES, toLatinDigits, type PhoneCountry } from "@/src/constants/phone";
import TextField from "./TextField";
import Sheet from "./Sheet";
import Text from "./Text";

export type PhoneFieldProps = {
  label?: string;
  required?: boolean;
  country: PhoneCountry;
  onCountryChange: (country: PhoneCountry) => void;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  hint?: string;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
};

/** حقل هاتف مع اختيار مفتاح الدولة (الكويت افتراضياً) */
export default function PhoneField({
  label = "رقم الهاتف",
  required,
  country,
  onCountryChange,
  value,
  onChangeText,
  error,
  hint,
  onSubmitEditing,
  autoFocus,
}: PhoneFieldProps) {
  const [open, setOpen] = useState(false);
  const maxLength = Math.max(...country.lengths);

  return (
    <>
      <TextField
        label={label}
        required={required}
        value={value}
        onChangeText={(text) => onChangeText(toLatinDigits(text).slice(0, maxLength))}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        placeholder={country.example}
        maxLength={maxLength}
        error={error}
        hint={hint}
        ltr
        autoFocus={autoFocus}
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
        prefix={
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`مفتاح الدولة ${country.nameAr} +${country.dialCode}`}
            style={({ pressed }) => [styles.country, pressed && { opacity: 0.7 }]}
          >
            <Text variant="bodyStrong">{country.flag}</Text>
            <Text variant="bodyStrong" tabular>{`+${country.dialCode}`}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        }
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title="مفتاح الدولة">
        {PHONE_COUNTRIES.map((c) => {
          const selected = c.dialCode === country.dialCode;
          return (
            <Pressable
              key={c.iso}
              onPress={() => {
                onCountryChange(c);
                onChangeText(value.slice(0, Math.max(...c.lengths)));
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && { opacity: 0.7 }]}
            >
              <Text variant="bodyLarge">{c.flag}</Text>
              <Text variant="body" style={styles.flex} color={selected ? "primary" : "text"}>
                {c.nameAr}
              </Text>
              <Text variant="bodyStrong" color="textSecondary" tabular>{`+${c.dialCode}`}</Text>
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  country: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: space[2],
    marginRight: space[1],
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: 28,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  optionOn: { backgroundColor: colors.primarySoft },
});
