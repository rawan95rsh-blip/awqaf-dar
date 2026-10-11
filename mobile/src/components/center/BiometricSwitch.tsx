import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch } from "react-native";
import { colors } from "@/src/theme";
import { Card, ListItem, Section, useToast } from "@/src/ui";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricEnabled,
  setBiometricEnabled,
  type BiometricAvailability,
} from "@/src/utils/biometric";

/**
 * قسم «الأمان»: تفعيل فتح التطبيق بالبصمة / Face ID.
 * لا يظهر إطلاقاً إن لم يدعم الجهاز البصمة. لا تُخزَّن كلمة المرور.
 */
export default function BiometricSwitch({ title = "الأمان" }: { title?: string }) {
  const toast = useToast();
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getBiometricAvailability(), getBiometricEnabled()]).then(([avail, isOn]) => {
      if (!active) return;
      setAvailability(avail);
      setEnabled(isOn);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!availability?.available) return null;
  const label = availability.label;

  const enable = async () => {
    setBusy(true);
    try {
      const result = await authenticateWithBiometrics(`تفعيل الدخول بـ ${label}`);
      if (result.success) {
        await setBiometricEnabled(true);
        setEnabled(true);
        toast.success(`تم تفعيل الدخول بـ ${label}`);
      } else if (!result.cancelled) {
        toast.error("لم يتم التحقق — حاولي مرة أخرى");
      }
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
    // تأكيد أولاً — لا نطلب البصمة مباشرة من لمسة المفتاح
    Alert.alert(
      `تفعيل الدخول بـ ${label}؟`,
      "يمكنكِ فتح التطبيق لاحقاً بالبصمة دون إدخال كلمة المرور. لن نخزّن كلمة المرور.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تفعيل", onPress: () => void enable() },
      ]
    );
  };

  return (
    <Section title={title}>
      <Card padding={0} style={styles.card}>
        <ListItem
          title={`الدخول بـ ${label}`}
          subtitle="فتح التطبيق بالبصمة دون إدخال كلمة المرور"
          leadingIcon={label === "Face ID" ? "face-recognition" : "fingerprint"}
          chevron={false}
          trailing={
            <Switch
              value={enabled}
              onValueChange={onToggle}
              disabled={busy}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel={`الدخول بـ ${label}`}
            />
          }
        />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
});
