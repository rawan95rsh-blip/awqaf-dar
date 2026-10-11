import { Alert, Platform } from "react-native";

/**
 * نافذة تأكيد تعمل على الجوال والويب (Alert لا يعرض أزراراً على الويب).
 * تُعيد true عند الموافقة.
 */
export function confirmAsync({
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(text) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
