import { TextField } from "@/src/ui";
import { formatHHMM } from "@/src/utils/format";
import { isValidTime, normalizeTime } from "./helpers";

function cleanTimeInput(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫.,،]/g, ":")
    .replace(/[^\d:]/g, "")
    .slice(0, 5);
}

/** «1030» أو «10.30» → «10:30» عند مغادرة الحقل */
function completeTime(text: string): string {
  if (/^\d{3,4}$/.test(text)) return normalizeTime(`${text.slice(0, -2)}:${text.slice(-2)}`);
  if (/^\d{1,2}$/.test(text)) return normalizeTime(`${text}:00`);
  return normalizeTime(text);
}

/** حقل وقت بصيغة 24 ساعة (HH:MM) مع معاينة بصيغة ص/م */
export default function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <TextField
      label={label}
      required
      value={value}
      onChangeText={(text) => onChange(cleanTimeInput(text))}
      onBlur={() => onChange(completeTime(value))}
      placeholder="16:30"
      keyboardType="numbers-and-punctuation"
      ltr
      icon="clock-outline"
      maxLength={5}
      error={error}
      hint={isValidTime(value) ? formatHHMM(normalizeTime(value)) : "بصيغة 24 ساعة مثل 16:30"}
    />
  );
}
