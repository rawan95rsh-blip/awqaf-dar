import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, space } from "@/src/theme";
import Text from "./Text";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type ChoiceOption<T extends string> = {
  id: T;
  label: string;
  icon?: IconName;
  description?: string;
  count?: number;
};

function tick() {
  void Haptics.selectionAsync().catch(() => undefined);
}

/** شرائح اختيار (مفرد أو متعدد) — بديل واضح للقوائم القصيرة */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  required,
  error,
  multiple,
}: {
  label?: string;
  options: ChoiceOption<T>[];
  value: T | T[] | null;
  onChange: (value: any) => void;
  required?: boolean;
  error?: string | null;
  multiple?: boolean;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label">
          {label}
          {required ? <Text variant="label" color="danger">{" *"}</Text> : null}
        </Text>
      ) : null}
      <View style={styles.wrap} accessibilityRole={multiple ? undefined : "radiogroup"}>
        {options.map((option) => {
          const isOn = selected.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                tick();
                if (multiple) {
                  onChange(isOn ? selected.filter((v) => v !== option.id) : [...selected, option.id]);
                } else {
                  onChange(option.id);
                }
              }}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked: isOn }}
              style={({ pressed }) => [
                styles.chip,
                isOn && styles.chipOn,
                !!error && !isOn && styles.chipError,
                pressed && styles.pressed,
              ]}
            >
              {isOn ? (
                <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />
              ) : option.icon ? (
                <MaterialCommunityIcons name={option.icon} size={16} color={colors.textSecondary} />
              ) : null}
              <Text variant="label" style={{ color: isOn ? colors.onPrimary : colors.text }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** بطاقات اختيار كبيرة مع وصف — للقرارات المهمة (مسار الانضمام…) */
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  required,
  error,
  columns = 2,
}: {
  label?: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  required?: boolean;
  error?: string | null;
  columns?: 1 | 2;
}) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label">
          {label}
          {required ? <Text variant="label" color="danger">{" *"}</Text> : null}
        </Text>
      ) : null}
      <View style={styles.cards} accessibilityRole="radiogroup">
        {options.map((option) => {
          const isOn = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                tick();
                onChange(option.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isOn }}
              style={({ pressed }) => [
                styles.card,
                columns === 2 && styles.cardHalf,
                isOn && styles.cardOn,
                !!error && !isOn && styles.chipError,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTop}>
                {option.icon ? (
                  <View style={[styles.cardIcon, isOn && styles.cardIconOn]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={20}
                      color={isOn ? colors.onPrimary : colors.primary}
                    />
                  </View>
                ) : null}
                <MaterialCommunityIcons
                  name={isOn ? "radiobox-marked" : "radiobox-blank"}
                  size={20}
                  color={isOn ? colors.primary : colors.borderStrong}
                />
              </View>
              <Text variant="bodyStrong" color={isOn ? "primary" : "text"}>
                {option.label}
              </Text>
              {option.description ? (
                <Text variant="caption" color="textSecondary">
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** تبويبات مقسّمة (Segmented) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const isOn = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              tick();
              onChange(option.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isOn }}
            style={[styles.segment, isOn && styles.segmentOn]}
          >
            {option.icon ? (
              <MaterialCommunityIcons
                name={option.icon}
                size={18}
                color={isOn ? colors.primary : colors.textSecondary}
              />
            ) : null}
            <Text variant="label" color={isOn ? "primary" : "textSecondary"} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** فلاتر أفقية قابلة للتمرير مع عدّاد */
export function FilterBar<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
      style={styles.filterScroll}
    >
      {options.map((option) => {
        const isOn = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              tick();
              onChange(option.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            style={({ pressed }) => [styles.filter, isOn && styles.filterOn, pressed && styles.pressed]}
          >
            {option.icon ? (
              <MaterialCommunityIcons
                name={option.icon}
                size={16}
                color={isOn ? colors.onPrimary : colors.textSecondary}
              />
            ) : null}
            <Text variant="label" style={{ color: isOn ? colors.onPrimary : colors.text }}>
              {option.label}
            </Text>
            {option.count != null ? (
              <View style={[styles.count, isOn && styles.countOn]}>
                <Text variant="micro" style={{ color: isOn ? colors.primary : colors.textSecondary }} tabular>
                  {String(option.count)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipError: { borderColor: colors.danger },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  card: {
    flexGrow: 1,
    flexBasis: "100%",
    padding: space[4],
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardHalf: { flexBasis: "45%" },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space[1] },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconOn: { backgroundColor: colors.primary },
  segmented: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: radius.sm,
  },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterScroll: { flexGrow: 0, marginHorizontal: -space[5] },
  filterBar: { gap: space[2], paddingHorizontal: space[5] },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  count: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  countOn: { backgroundColor: colors.onPrimary },
});
