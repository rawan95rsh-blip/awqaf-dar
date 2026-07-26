import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_unlock_enabled';

export type BiometricAvailability = {
  available: boolean;
  label: string;
};

function biometricLabel(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'بصمة الإصبع';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'التحقق البيومتري';
  }
  return 'البصمة';
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, label: 'البصمة' };
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { available: false, label: 'البصمة' };
    }
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return { available: true, label: biometricLabel(types) };
  } catch {
    return { available: false, label: 'البصمة' };
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
    return;
  }
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export type BiometricAuthResult = {
  success: boolean;
  /** ألغى المستخدم نافذة النظام أو النظام ألغاها أثناء لمسة الواجهة */
  cancelled: boolean;
};

/** يتحقق من هوية الجهاز فقط — لا يقرأ ولا يخزّن كلمة المرور */
export async function authenticateWithBiometrics(
  promptMessage = 'فتح التطبيق بالبصمة'
): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'إلغاء',
      // false: يسمح برمز الجهاز إن تعذّر Face ID مباشرة (مهم لـ Expo Go)
      disableDeviceFallback: false,
      fallbackLabel: 'رمز الجهاز',
    });
    if (result.success) {
      return { success: true, cancelled: false };
    }
    const error = 'error' in result ? String(result.error ?? '') : '';
    const cancelled =
      error === 'user_cancel' ||
      error === 'system_cancel' ||
      error === 'app_cancel';
    return { success: false, cancelled };
  } catch {
    return { success: false, cancelled: false };
  }
}

/**
 * بعد login ناجح: يعرض تفعيل البصمة إن توفرت ولم تكن مفعّلة.
 * يستدعي onDone دائماً (تفعيل / رفض / غير متاح).
 */
export function promptEnableBiometricsAfterLogin(onDone: () => void): void {
  void (async () => {
    try {
      const [availability, enabled] = await Promise.all([
        getBiometricAvailability(),
        getBiometricEnabled(),
      ]);
      if (!availability.available || enabled) {
        onDone();
        return;
      }

      Alert.alert(
        `تفعيل الدخول بـ ${availability.label}؟`,
        'يمكنك فتح التطبيق لاحقاً بالبصمة دون إدخال كلمة المرور. لن نخزّن كلمة المرور.',
        [
          {
            text: 'لاحقاً',
            style: 'cancel',
            onPress: onDone,
          },
          {
            text: 'تفعيل',
            onPress: () => {
              void (async () => {
                const result = await authenticateWithBiometrics(
                  `تفعيل الدخول بـ ${availability.label}`
                );
                if (result.success) {
                  await setBiometricEnabled(true);
                }
                onDone();
              })();
            },
          },
        ],
        { cancelable: false }
      );
    } catch {
      onDone();
    }
  })();
}
