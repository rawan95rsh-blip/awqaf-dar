import * as SecureStore from 'expo-secure-store';
import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type { User } from '@/src/types/auth';

export interface LoginCredentials {
  phone?: string;
  idNumber?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type LoginSuccessCallback = (data: LoginResponse) => void;
export type LoginErrorCallback = (error: Error) => void;

/** 12 رقماً → هوية مدنية كويتية، وإلا هاتف */
export function buildLoginCredentials(
  identifier: string,
  password: string
): LoginCredentials {
  const trimmed = identifier.trim().replace(/\s/g, '');
  if (/^\d{12}$/.test(trimmed)) {
    return { idNumber: trimmed, password };
  }
  return { phone: trimmed, password };
}

export interface RegisterCenterRequest {
  email: string;
  phone: string;
  password: string;
  centerName: string;
  supervisorName: string;
  specializations: string[];
}

export interface RegisterCenterResponse {
  message: string;
  phone: string;
  devCode?: string;
}

export interface VerifyCenterRequest {
  phone: string;
  code: string;
}

export type RegisterCenterSuccessCallback = (data: RegisterCenterResponse) => void;
export type VerifyCenterSuccessCallback = (data: LoginResponse) => void;

export function loginApi(
  credentials: LoginCredentials,
  onSuccess: LoginSuccessCallback,
  onError: LoginErrorCallback
): void {
  apiClient
    .post<ApiSuccess<LoginResponse>>('/api/auth/login', credentials)
    .then((response) => {
      const { token, user } = response.data.data;
      if (!token || !user) {
        onError(new Error('استجابة غير صالحة من الخادم'));
        return;
      }
      onSuccess({ token, user });
    })
    .catch((err) => {
      onError(new Error(getApiErrorMessage(err)));
    });
}

export function registerCenterApi(
  data: RegisterCenterRequest,
  onSuccess: RegisterCenterSuccessCallback,
  onError: LoginErrorCallback
): void {
  apiClient
    .post<ApiSuccess<RegisterCenterResponse>>('/api/auth/register-center', data)
    .then((response) => {
      const payload = response.data.data;
      if (!payload?.phone) {
        onError(new Error('استجابة غير صالحة من الخادم'));
        return;
      }
      onSuccess(payload);
    })
    .catch((err) => {
      onError(new Error(getApiErrorMessage(err)));
    });
}

export function verifyCenterApi(
  data: VerifyCenterRequest,
  onSuccess: VerifyCenterSuccessCallback,
  onError: LoginErrorCallback
): void {
  apiClient
    .post<ApiSuccess<LoginResponse>>('/api/auth/verify-center', data)
    .then((response) => {
      const { token, user } = response.data.data;
      if (!token || !user) {
        onError(new Error('استجابة غير صالحة من الخادم'));
        return;
      }
      onSuccess({ token, user });
    })
    .catch((err) => {
      onError(new Error(getApiErrorMessage(err)));
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

const PENDING_REG_KEY = 'pending_center_registration';
const PENDING_PHONE_KEY = 'pending_center_phone';

export function setPendingRegistrationPhone(phone: string, callback: () => void): void {
  SecureStore.setItemAsync(PENDING_PHONE_KEY, phone).then(callback);
}

export function getPendingRegistrationPhone(
  callback: (phone: string | null) => void
): void {
  SecureStore.getItemAsync(PENDING_PHONE_KEY).then(callback);
}

export function removePendingRegistrationPhone(callback: () => void): void {
  SecureStore.deleteItemAsync(PENDING_PHONE_KEY).then(callback);
}

/** يتحقق أن الجلسة المحفوظة صالحة (ليست mock ولا ناقصة) */
export function isStoredSessionValid(
  token: string | null | undefined,
  user: User | null | undefined
): boolean {
  if (!token?.trim()) return false;
  if (token.startsWith('mock-token')) return false;
  if (!user?.id?.trim()) return false;
  return true;
}

/** مسح كل بيانات الجلسة والتسجيل المؤقت من SecureStore */
export function clearAuthSession(callback: () => void): void {
  Promise.all([
    SecureStore.deleteItemAsync('token'),
    SecureStore.deleteItemAsync(USER_STORAGE_KEY),
    SecureStore.deleteItemAsync(PENDING_REG_KEY),
    SecureStore.deleteItemAsync(PENDING_PHONE_KEY),
  ])
    .then(() => callback())
    .catch(() => callback());
}
