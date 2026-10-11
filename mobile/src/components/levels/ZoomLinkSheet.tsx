import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Sheet, Text, TextField } from "@/src/ui";
import { space } from "@/src/theme";

/** إضافة/تعديل رابط Zoom للحصة — حقل لاتيني بلوحة مفاتيح الروابط */
export default function ZoomLinkSheet({
  visible,
  initialUrl,
  loading,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialUrl?: string;
  loading: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(initialUrl ?? "");
      setError(null);
    }
  }, [visible, initialUrl]);

  const submit = () => {
    const trimmed = url.trim();
    if (!/^https:\/\/\S+$/i.test(trimmed)) {
      setError("الرابط يجب أن يبدأ بـ https://");
      return;
    }
    onSave(trimmed);
  };

  return (
    <Sheet
      visible={visible}
      onClose={loading ? () => undefined : onClose}
      title={initialUrl ? "تعديل رابط Zoom" : "إضافة رابط Zoom"}
      footer={
        <View style={{ gap: space[2] }}>
          <Button fullWidth onPress={submit} loading={loading} icon="content-save-outline">
            حفظ الرابط
          </Button>
          <Button fullWidth variant="ghost" onPress={onClose} disabled={loading}>
            إلغاء
          </Button>
        </View>
      }
    >
      <Text variant="body" color="textSecondary">
        الصقي رابط الاجتماع ليظهر زر «الانضمام عبر Zoom» للطالبات في هذه الحصة.
      </Text>
      <TextField
        label="رابط Zoom"
        required
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          if (error) setError(null);
        }}
        placeholder="https://zoom.us/j/…"
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        icon="link-variant"
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </Sheet>
  );
}
