import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme";
import { formatDateLong } from "@/src/utils/format";
import Sheet from "./Sheet";
import Button from "./Button";
import Text from "./Text";
import { fieldStyles } from "./TextField";

export type DateFieldProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  required?: boolean;
  error?: string | null;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** التاريخ المبدئي في المنتقي عند عدم وجود قيمة */
  initialDate?: Date;
};

export default function DateField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder = "اختاري التاريخ",
  minimumDate,
  maximumDate,
  initialDate,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? initialDate ?? new Date());

  const openPicker = () => {
    setDraft(value ?? initialDate ?? new Date());
    setOpen(true);
  };

  const handleAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === "set" && date) onChange(date);
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label">
        {label}
        {required ? <Text variant="label" color="danger">{" *"}</Text> : null}
      </Text>
      {Platform.OS === "web" ? (
        <View style={[fieldStyles.field, { borderColor: error ? colors.danger : colors.border }]}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textMuted} />
          {/* حقل تاريخ HTML للمعاينة على الويب */}
          <input
            type="date"
            aria-label={label}
            value={value ? value.toISOString().slice(0, 10) : ""}
            min={minimumDate?.toISOString().slice(0, 10)}
            max={maximumDate?.toISOString().slice(0, 10)}
            onChange={(e) => {
              const d = new Date(e.currentTarget.value);
              if (!Number.isNaN(d.getTime())) onChange(d);
            }}
            style={{ flex: 1, border: "none", fontSize: 16, background: "transparent", fontFamily: "inherit" }}
          />
        </View>
      ) : (
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            fieldStyles.field,
            { borderColor: error ? colors.danger : colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textMuted} />
          <Text variant="bodyLarge" color={value ? "text" : "textMuted"} style={styles.flex}>
            {value ? formatDateLong(value) : placeholder}
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroid}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={label}
          scroll={false}
          footer={
            <Button
              fullWidth
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              تم
            </Button>
          }
        >
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            locale="ar"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_e, d) => d && setDraft(d)}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: 6 },
});
