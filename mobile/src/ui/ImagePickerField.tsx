import { useState } from "react";
import { ActionSheetIOS, Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import { useAuthImageSource } from "@/src/hooks/useAuthImage";
import Text from "./Text";

export type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** ضغط الصورة قبل الرفع (أقصى عرض 1600px، جودة 0.7) */
async function compress(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export default function ImagePickerField({
  label,
  description,
  icon = "card-account-details-outline",
  value,
  existingUrl,
  onChange,
  required,
  error,
  aspect,
}: {
  label: string;
  description?: string;
  icon?: IconName;
  value: PickedImage | null;
  /** مرفق محفوظ مسبقاً على الخادم (عند التعديل) */
  existingUrl?: string | null;
  onChange: (image: PickedImage | null) => void;
  required?: boolean;
  error?: string | null;
  aspect?: [number, number];
}) {
  const [busy, setBusy] = useState(false);
  const existingSource = useAuthImageSource(existingUrl);
  const previewSource = value ? { uri: value.uri } : existingSource;

  const pick = async (source: "camera" | "library") => {
    try {
      setBusy(true);
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("الكاميرا", "اسمحي للتطبيق باستخدام الكاميرا من الإعدادات");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: !!aspect,
        aspect,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;
      const uri = await compress(result.assets[0].uri);
      onChange({ uri, name: `${label}.jpg`, type: "image/jpeg" });
    } catch (err) {
      Alert.alert("تعذّر اختيار الصورة", err instanceof Error ? err.message : "حاولي مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  const choose = () => {
    if (Platform.OS === "web") {
      void pick("library");
      return;
    }
    const buttons = ["التقاط صورة", "اختيار من الصور", ...(value ? ["إزالة الصورة"] : []), "إلغاء"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: buttons,
          cancelButtonIndex: buttons.length - 1,
          destructiveButtonIndex: value ? 2 : undefined,
          title: label,
        },
        (index) => {
          if (index === 0) void pick("camera");
          if (index === 1) void pick("library");
          if (value && index === 2) onChange(null);
        }
      );
      return;
    }
    Alert.alert(label, undefined, [
      { text: "التقاط صورة", onPress: () => void pick("camera") },
      { text: "اختيار من الصور", onPress: () => void pick("library") },
      ...(value ? [{ text: "إزالة", style: "destructive" as const, onPress: () => onChange(null) }] : []),
      { text: "إلغاء", style: "cancel" as const },
    ]);
  };

  const hasImage = !!previewSource;

  return (
    <Pressable
      onPress={choose}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${label}${hasImage ? " — تم الإرفاق" : ""}`}
      style={({ pressed }) => [
        styles.tile,
        hasImage && styles.tileDone,
        !!error && !hasImage && styles.tileError,
        pressed && { opacity: 0.85 },
      ]}
    >
      {hasImage && previewSource ? (
        <Image source={previewSource} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text variant="bodyStrong">
          {label}
          {required ? <Text variant="bodyStrong" color="danger">{" *"}</Text> : null}
        </Text>
        <Text variant="caption" color={error && !hasImage ? "danger" : "textSecondary"}>
          {busy
            ? "جاري التجهيز…"
            : hasImage
              ? value
                ? "تم الإرفاق — اضغطي للتغيير"
                : "مرفق محفوظ — اضغطي للاستبدال"
              : error ?? description ?? "التقاط صورة أو اختيارها من الجهاز"}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={hasImage ? "check-circle" : "camera-plus-outline"}
        size={22}
        color={hasImage ? colors.success : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  tileDone: {
    borderStyle: "solid",
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  tileError: { borderColor: colors.danger },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  body: { flex: 1, gap: 2 },
});
