import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Sheet from "./Sheet";
import TextField from "./TextField";
import Button, { type ButtonVariant } from "./Button";
import Text from "./Text";

/**
 * نافذة تأكيد مع حقل نص (سبب الرفض / سبب وقف القيد / سبب الاعتذار…)
 * تظهر فوق لوحة المفاتيح فلا يُحجب الحقل.
 */
export default function PromptSheet({
  visible,
  onClose,
  title,
  message,
  inputLabel = "السبب",
  placeholder,
  confirmLabel = "تأكيد",
  confirmVariant = "primary",
  required = true,
  minLength = 3,
  loading,
  onConfirm,
  children,
  initialValue = "",
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  inputLabel?: string | null;
  placeholder?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  required?: boolean;
  minLength?: number;
  loading?: boolean;
  onConfirm: (text: string) => void;
  children?: ReactNode;
  initialValue?: string;
}) {
  const [text, setText] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = text.trim();
    if (inputLabel && required && trimmed.length < minLength) {
      setError(`اكتبي ${inputLabel} (${minLength} أحرف على الأقل)`);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={{ gap: 8 }}>
          <Button fullWidth variant={confirmVariant} loading={loading} onPress={submit}>
            {confirmLabel}
          </Button>
          <Button fullWidth variant="ghost" onPress={onClose} disabled={loading}>
            إلغاء
          </Button>
        </View>
      }
    >
      {message ? (
        <Text variant="body" color="textSecondary">
          {message}
        </Text>
      ) : null}
      {children}
      {inputLabel ? (
        <TextField
          label={inputLabel}
          required={required}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          multiline
          maxLength={500}
          showCounter
          error={error}
          autoFocus
        />
      ) : null}
    </Sheet>
  );
}
