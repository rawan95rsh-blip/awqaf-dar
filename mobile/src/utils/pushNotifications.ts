import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerDeviceApi } from '@/src/api/devices';

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'awqaf-dar-default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (fromEnv) {
    console.log('[push] projectId from EXPO_PUBLIC_EAS_PROJECT_ID');
    return fromEnv;
  }

  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === 'string' && fromEasConfig.trim()) {
    console.log('[push] projectId from Constants.easConfig');
    return fromEasConfig.trim();
  }

  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    console.log('[push] projectId from expoConfig.extra');
    return fromExtra.trim();
  }

  console.warn('[push] no projectId resolved');
  return undefined;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
    name: 'تنبيهات دور القرآن',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1d9bf0',
    sound: 'default',
  });
}

export type PushRegistrationResult = {
  token: string | null;
  status:
    | 'registered'
    | 'web'
    | 'simulator'
    | 'permission_denied'
    | 'missing_project_id'
    | 'token_failed'
    | 'api_failed';
  detail?: string;
};

/**
 * يطلب الإذن ويسجّل Expo Push Token في الباك اند.
 * يعيد نتيجة تفصيلية للتشخيص (لا يمنع دخول التطبيق).
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  try {
    if (Platform.OS === 'web') {
      return { token: null, status: 'web' };
    }

    if (!Device.isDevice) {
      console.warn('[push] Physical device required for push tokens');
      return { token: null, status: 'simulator' };
    }

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = String((existing as { status?: string }).status ?? '');
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = String((requested as { status?: string }).status ?? '');
    }
    if (finalStatus !== 'granted') {
      console.warn('[push] Permission not granted');
      return { token: null, status: 'permission_denied' };
    }

    const projectId = resolveProjectId();
    let token: string;
    try {
      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      token = tokenResponse.data;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn('[push] getExpoPushTokenAsync failed', detail);
      if (!projectId) {
        return {
          token: null,
          status: 'missing_project_id',
          detail:
            'أضيفي EXPO_PUBLIC_EAS_PROJECT_ID بعد eas login && eas init — ' +
            detail,
        };
      }
      return { token: null, status: 'token_failed', detail };
    }

    if (!token) {
      return { token: null, status: 'token_failed', detail: 'empty token' };
    }

    const platform =
      Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown';

    try {
      await registerDeviceApi(token, platform);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn('[push] registerDeviceApi failed', detail);
      return { token: null, status: 'api_failed', detail };
    }

    console.log('[push] registered', token.slice(0, 28) + '…');
    return { token, status: 'registered' };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn('[push] register failed', detail);
    return { token: null, status: 'token_failed', detail };
  }
}
