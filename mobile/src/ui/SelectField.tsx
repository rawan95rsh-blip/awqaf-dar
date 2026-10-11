import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import Sheet from "./Sheet";
import Text from "./Text";
import { fieldStyles } from "./TextField";
import SearchBar from "./SearchBar";
import Button from "./Button";

export type SelectOption = {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type BaseProps = {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  searchable?: boolean;
  emptyText?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string | null;
  onChange: (id: string) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

export type SelectFieldProps = SingleProps | MultiProps;

/** حقل اختيار يفتح لوحة سفلية — مع بحث للقوائم الطويلة */
export default function SelectField(props: SelectFieldProps) {
  const { label, options, placeholder = "اختاري", required, disabled, error, hint, emptyText } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const searchable = props.searchable ?? options.length > 8;

  const selectedIds = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedLabel = options
    .filter((o) => selectedIds.includes(o.id))
    .map((o) => o.label)
    .join("، ");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((o) => o.label.includes(q) || o.description?.includes(q));
  }, [options, query]);

  const openSheet = () => {
    if (disabled) return;
    setQuery("");
    setDraft(selectedIds);
    setOpen(true);
  };

  const choose = (id: string) => {
    if (props.multiple) {
      setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      return;
    }
    props.onChange(id);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label">
        {label}
        {required ? <Text variant="label" color="danger">{" *"}</Text> : null}
      </Text>
      <Pressable
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}${selectedLabel ? `: ${selectedLabel}` : ""}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={({ pressed }) => [
          fieldStyles.field,
          { borderColor: error ? colors.danger : colors.border },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text
          variant="bodyLarge"
          color={selectedLabel ? "text" : "textMuted"}
          numberOfLines={1}
          style={styles.flex}
        >
          {selectedLabel || placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} />
          <Text variant="caption" color="danger">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={props.multiple ? "يمكن اختيار أكثر من خيار" : undefined}
        footer={
          props.multiple ? (
            <Button
              fullWidth
              onPress={() => {
                props.onChange(draft);
                setOpen(false);
              }}
            >
              {draft.length ? `تأكيد (${draft.length})` : "تأكيد"}
            </Button>
          ) : undefined
        }
      >
        {searchable ? <SearchBar value={query} onChangeText={setQuery} placeholder="بحث…" /> : null}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
              {emptyText ?? "لا توجد خيارات"}
            </Text>
          ) : (
            filtered.map((option) => {
              const selected = props.multiple ? draft.includes(option.id) : selectedIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => choose(option.id)}
                  disabled={option.disabled}
                  accessibilityRole={props.multiple ? "checkbox" : "radio"}
                  accessibilityState={{ checked: selected, disabled: !!option.disabled }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.pressed,
                    option.disabled && styles.disabled,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text variant={selected ? "bodyStrong" : "body"} color={selected ? "primary" : "text"}>
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text variant="caption" color="textSecondary">
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons
                    name={
                      props.multiple
                        ? selected
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                        : selected
                          ? "radiobox-marked"
                          : "radiobox-blank"
                    }
                    size={22}
                    color={selected ? colors.primary : colors.borderStrong}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: 6 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  messageRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  list: { gap: space[1] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    minHeight: 52,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
  },
  empty: { paddingVertical: space[6] },
});
