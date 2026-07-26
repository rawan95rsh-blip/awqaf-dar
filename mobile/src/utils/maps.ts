import { Alert, Linking, Platform } from 'react-native';

export type CenterLocationQuery = {
  addressText?: string | null;
  city?: string | null;
  nameAr?: string | null;
};

/** يبني نص البحث للخرائط من العنوان والمدينة واسم المركز */
export function buildCenterMapsQuery(location: CenterLocationQuery): string {
  return [location.addressText, location.city, location.nameAr]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export function hasCenterLocation(location: CenterLocationQuery): boolean {
  return Boolean(location.addressText?.trim() || location.city?.trim());
}

/**
 * يفتح العنوان في تطبيق الخرائط الخارجي (Apple Maps على iOS / Google Maps على Android).
 * بدون خريطة مدمجة داخل التطبيق.
 */
export async function openCenterInMaps(location: CenterLocationQuery): Promise<void> {
  const query = buildCenterMapsQuery(location);
  if (!query) {
    Alert.alert('تنبيه', 'لا يوجد عنوان لفتحه في الخرائط');
    return;
  }

  const encoded = encodeURIComponent(query);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${encoded}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('تعذر الفتح', 'لا يمكن فتح تطبيق الخرائط على هذا الجهاز');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('تعذر الفتح', 'حدث خطأ أثناء فتح الخرائط');
  }
}
