import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricEnabled,
  setBiometricEnabled,
  type BiometricAvailability,
} from '@/src/utils/biometric';
import { colors, spacing } from '@/constants';

type Props = {
  accentColor?: string;
  textColor?: string;
  secondaryColor?: string;
};

/**
 * تبديل تفعيل/إيقاف فتح التطبيق بالبصمة (لا يخزّن كلمة المرور).
 * التفعيل يمر عبر Alert ثم Face ID — نفس مسار ما بعد تسجيل الدخول.
 */
export default function BiometricToggle({
  accentColor = colors.primary,
  textColor = colors.text,
  secondaryColor = colors.textSecondary,
}: Props) {
  const [availability, setAvailability] = useState<BiometricAvailability | null>(
    null
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [avail, isOn] = await Promise.all([
        getBiometricAvailability(),
        getBiometricEnabled(),
      ]);
      setAvailability(avail);
      setEnabled(isOn);
    })();
  }, []);

  if (!availability?.available) {
    return null;
  }

  const enableWithBiometrics = () => {
    setBusy(true);
    void (async () => {
      try {
        const result = await authenticateWithBiometrics(
          `تفعيل الدخول بـ ${availability.label}`
        );
        if (result.success) {
          await setBiometricEnabled(true);
          setEnabled(true);
          return;
        }
        if (!result.cancelled) {
          Alert.alert('تنبيه', 'لم يتم التحقق من البصمة');
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  const handleToggle = (next: boolean) => {
    if (busy) return;

    if (!next) {
      setBusy(true);
      void (async () => {
        try {
          await setBiometricEnabled(false);
          setEnabled(false);
        } finally {
          setBusy(false);
        }
      })();
      return;
    }

    // لا نطلب Face ID من لمسة الـ Switch مباشرة — نفتح تأكيداً أولاً
    Alert.alert(
      `تفعيل الدخول بـ ${availability.label}؟`,
      'يمكنك فتح التطبيق لاحقاً بالبصمة دون إدخال كلمة المرور. لن نخزّن كلمة المرور.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تفعيل', onPress: enableWithBiometrics },
      ]
    );
  };

  return (
    <View style={styles.row}>
      <Switch
        value={enabled}
        onValueChange={handleToggle}
        disabled={busy}
        trackColor={{ false: '#d1d5db', true: accentColor }}
        accessibilityLabel={`الدخول بـ ${availability.label}`}
      />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: textColor }]}>
          الدخول بـ {availability.label}
        </Text>
        <Text style={[styles.hint, { color: secondaryColor }]}>
          فتح التطبيق بالبصمة دون إدخال كلمة المرور
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right',
  },
});
