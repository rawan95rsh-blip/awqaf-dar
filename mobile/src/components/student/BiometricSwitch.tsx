import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Switch, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space, toneColors } from "@/src/theme";
import { Text, useToast } from "@/src/ui";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricEnabled,
  setBiometricEnabled,
  type BiometricAvailability,
} from "@/src/utils/biometric";

/**
 * مفتاح الدخول بالبصمة / Face ID — نفس منطق BiometricToggle بتصميم «سكينة».
 * لا يخزّن كلمة المرور؛ التفعيل يمرّ بتأكيد ثم تحقق بيومتري فعلي.
 * لا يظهر إطلاقاً على جهاز لا يدعم البصمة.
 */
export default function BiometricSwitch({ divider = false }: { divider?: boolean }) {
  const toast = useToast();
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [avail, isOn] = await Promise.all([getBiometricAvailability(), getBiometricEnabled()]);
      if (!alive) return;
      setAvailability(avail);
      setEnabled(isOn);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!availability?.available) return null;
  const label = availability.label;
  const isFace = label === "Face ID";

  const enable = async () => {
    setBusy(true);
    try {
      const result = await authenticateWithBiometrics(`تفعيل الدخول بـ ${label}`);
      if (result.success) {
        await setBiometricEnabled(true);
        setEnabled(true);
        toast.success(`تم تفعيل الدخول بـ ${label}`);
        return;
      }
      if (!result.cancelled) toast.error("لم يتم التحقق — حاولي مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await setBiometricEnabled(false);
      setEnabled(false);
      toast.success(`تم إيقاف الدخول بـ ${label}`);
    } finally {
      setBusy(false);
    }
  };

  const onToggle = (next: boolean) => {
    if (busy) return;
    if (!next) {
      void disable();
      return;
    }
    // لا نطلب التحقق مباشرة من لمسة المفتاح — نؤكّد أولاً
    Alert.alert(
      `تفعيل الدخول بـ ${label}؟`,
      "يمكنكِ فتح التطبيق لاحقاً دون إدخال كلمة المرور. لا نخزّن كلمة المرور على الجهاز.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تفعيل", onPress: () => void enable() },
      ]
    );
  };

  const tone = toneColors[enabled ? "primary" : "neutral"];

  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <MaterialCommunityIcons name={isFace ? "face-recognition" : "fingerprint"} size={20} color={tone.fg} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong">{`الدخول بـ ${label}`}</Text>
        <Text variant="caption" color="textSecondary">
          {enabled ? "مفعّل — افتحي التطبيق دون كلمة المرور" : "افتحي التطبيق بسرعة دون كلمة المرور"}
        </Text>
      </View>
      {busy ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
      <Switch
        value={enabled}
        onValueChange={onToggle}
        disabled={busy}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={Platform.OS === "android" ? (enabled ? colors.primaryMuted : colors.surface) : undefined}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel={`الدخول بـ ${label}`}
        accessibilityState={{ checked: enabled, disabled: busy, busy }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  spinner: { marginEnd: space[1] },
});
