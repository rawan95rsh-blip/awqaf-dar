import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, fonts, radius, space } from "@/src/theme";

export type SearchBarProps = Omit<TextInputProps, "style"> & {
  value: string;
  onChangeText: (text: string) => void;
};

export default function SearchBar({ value, onChangeText, placeholder = "بحث", ...rest }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={styles.input}
        {...rest}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="مسح البحث"
        >
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    height: 46,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
});
