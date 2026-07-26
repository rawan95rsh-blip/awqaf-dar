import { Alert, Linking } from "react-native";

/** فتح رابط Zoom خارجياً — لا SDK في v1 */
export async function openZoomUrl(url: string | undefined | null): Promise<void> {
  const trimmed = url?.trim();
  if (!trimmed) {
    Alert.alert("تنبيه", "لا يوجد رابط Zoom لهذه الحصة");
    return;
  }
  try {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (!canOpen) {
      Alert.alert("تعذر الفتح", "لا يمكن فتح رابط Zoom على هذا الجهاز");
      return;
    }
    await Linking.openURL(trimmed);
  } catch {
    Alert.alert("خطأ", "تعذر فتح رابط Zoom");
  }
}
