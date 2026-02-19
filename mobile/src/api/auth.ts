import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import type { User } from '@/src/types/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/** عند true فقط: تسجيل الدخول تجريبي بدون API. الافتراضي false = دخول حقيقي عبر الباك اند. */
const USE_MOCK_LOGIN = process.env.EXPO_PUBLIC_USE_MOCK_LOGIN === 'true';

/** حساب تجريبي للاختبار عندما USE_MOCK_LOGIN = true */
export const MOCK_TEST_ACCOUNT = {
  phone: '0512345678',
  password: '123456',
} as const;

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type LoginSuccessCallback = (data: LoginResponse) => void;
export type LoginErrorCallback = (error: Error) => void;

/**
 * تسجيل الدخول. إن كان الوضع Mock يُقبل الحساب التجريبي فقط دون استدعاء API.
 */
export function loginApi(
  credentials: LoginCredentials,
  onSuccess: LoginSuccessCallback,
  onError: LoginErrorCallback
): void {
  if (USE_MOCK_LOGIN) {
    const phone = credentials.phone.trim().replace(/\s/g, '');
    const ok =
      (phone === MOCK_TEST_ACCOUNT.phone || phone === MOCK_TEST_ACCOUNT.phone.replace(/^0/, '')) &&
      credentials.password === MOCK_TEST_ACCOUNT.password;
    setTimeout(() => {
      if (ok) {
        onSuccess({
          token: 'mock-token-' + Date.now(),
          user: { id: '1', phone: phone || MOCK_TEST_ACCOUNT.phone, email: 'test@example.com' },
        });
      } else {
        onError(new Error('رقم الهاتف أو كلمة المرور غير صحيحة'));
      }
    }, 400);
    return;
  }

  axios
    .post<{ data?: LoginResponse }>(
      `${API_URL}/api/auth/login`,
      credentials,
      { headers: { 'Content-Type': 'application/json' } }
    )
    .then((response) => {
      const raw = response.data?.data ?? response.data;
      const token = raw && typeof raw === 'object' && 'token' in raw ? raw.token : undefined;
      const user = raw && typeof raw === 'object' && 'user' in raw ? (raw.user as User) : undefined;
      if (!token || !user) {
        onError(new Error('استجابة غير صالحة من الخادم'));
        return;
      }
      onSuccess({ token, user });
    })
    .catch((err) => {
      onError(err?.response?.data?.message ? new Error(err.response.data.message) : err instanceof Error ? err : new Error('فشل تسجيل الدخول'));
    });
}

export function getStoredToken(callback: (token: string | null) => void): void {
  SecureStore.getItemAsync('token').then(callback);
}

export function setStoredToken(token: string, callback: () => void): void {
  SecureStore.setItemAsync('token', token).then(callback);
}

export function removeStoredToken(callback: () => void): void {
  SecureStore.deleteItemAsync('token').then(callback);
}

const USER_STORAGE_KEY = 'auth_user';

export function getStoredUser(callback: (user: User | null) => void): void {
  SecureStore.getItemAsync(USER_STORAGE_KEY).then((raw) => {
    if (!raw) {
      callback(null);
      return;
    }
    try {
      callback(JSON.parse(raw) as User);
    } catch {
      callback(null);
    }
  });
}

export function setStoredUser(user: User, callback: () => void): void {
  SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user)).then(callback);
}

export function removeStoredUser(callback: () => void): void {
  SecureStore.deleteItemAsync(USER_STORAGE_KEY).then(callback);
}

/** بيانات إنشاء حساب المركز المؤقتة (حتى إتمام التحقق بالكود) */
export interface PendingCenterRegistration {
  email: string;
  phone: string;
  password: string;
  centerName: string | null;
  supervisorName: string;
  specializations: string[];
}

const PENDING_REG_KEY = 'pending_center_registration';

export function setPendingCenterRegistration(
  data: PendingCenterRegistration,
  callback: () => void
): void {
  SecureStore.setItemAsync(PENDING_REG_KEY, JSON.stringify(data)).then(callback);
}

export function getPendingCenterRegistration(
  callback: (data: PendingCenterRegistration | null) => void
): void {
  SecureStore.getItemAsync(PENDING_REG_KEY).then((raw) => {
    if (!raw) {
      callback(null);
      return;
    }
    try {
      callback(JSON.parse(raw) as PendingCenterRegistration);
    } catch {
      callback(null);
    }
  });
}

export function removePendingCenterRegistration(callback: () => void): void {
  SecureStore.deleteItemAsync(PENDING_REG_KEY).then(callback);
}
