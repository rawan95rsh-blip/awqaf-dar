import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type { User } from '@/src/types/auth';
import { deleteItem, getItem, setItem } from '@/src/utils/storage';

export interface LoginCredentials {
  phone?: string;
  countryCode?: string;
  idNumber?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterCenterRequest {
  email?: string;
  phone: string;
  countryCode: string;
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
  countryCode?: string;
  code: string;
}

function unwrapLogin(data: LoginResponse | undefined): LoginResponse {
  if (!data?.token || !data.user) throw new Error('استجابة غير صالحة من الخادم');
  return data;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<ApiSuccess<LoginResponse>>('/api/auth/login', credentials);
    return unwrapLogin(response.data.data);
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function registerCenter(data: RegisterCenterRequest): Promise<RegisterCenterResponse> {
  try {
    const response = await apiClient.post<ApiSuccess<RegisterCenterResponse>>(
      '/api/auth/register-center',
      data
    );
    if (!response.data.data?.phone) throw new Error('استجابة غير صالحة من الخادم');
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function verifyCenter(data: VerifyCenterRequest): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<ApiSuccess<LoginResponse>>('/api/auth/verify-center', data);
    return unwrapLogin(response.data.data);
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function resendCenterCode(phone: string): Promise<{ message: string; devCode?: string }> {
  try {
    const response = await apiClient.post<ApiSuccess<{ message: string; devCode?: string }>>(
      '/api/auth/resend-code',
      { phone }
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

// ———— التخزين المحلي للجلسة ————

const TOKEN_KEY = 'token';
const USER_STORAGE_KEY = 'auth_user';
const PENDING_PHONE_KEY = 'pending_center_phone';

export function getStoredToken(callback: (token: string | null) => void): void {
  void getItem(TOKEN_KEY).then(callback).catch(() => callback(null));
}

export function setStoredToken(token: string, callback: () => void): void {
  void setItem(TOKEN_KEY, token).then(callback).catch(callback);
}

export function getStoredUser(callback: (user: User | null) => void): void {
  void getItem(USER_STORAGE_KEY)
    .then((raw) => {
      if (!raw) {
        callback(null);
        return;
      }
      try {
        callback(JSON.parse(raw) as User);
      } catch {
        callback(null);
      }
    })
    .catch(() => callback(null));
}

export function setStoredUser(user: User, callback: () => void): void {
  void setItem(USER_STORAGE_KEY, JSON.stringify(user)).then(callback).catch(callback);
}

/** رقم المركز الذي ينتظر التحقق (بصيغة دولية) */
export async function setPendingRegistrationPhone(phone: string): Promise<void> {
  await setItem(PENDING_PHONE_KEY, phone);
}

export async function getPendingRegistrationPhone(): Promise<string | null> {
  return getItem(PENDING_PHONE_KEY);
}

export async function removePendingRegistrationPhone(): Promise<void> {
  await deleteItem(PENDING_PHONE_KEY);
}

/** يتحقق أن الجلسة المحفوظة صالحة (ليست ناقصة) */
export function isStoredSessionValid(
  token: string | null | undefined,
  user: User | null | undefined
): boolean {
  if (!token?.trim()) return false;
  if (token.startsWith('mock-token')) return false;
  if (!user?.id?.trim()) return false;
  return true;
}

/** مسح كل بيانات الجلسة */
export function clearAuthSession(callback: () => void): void {
  Promise.all([deleteItem(TOKEN_KEY), deleteItem(USER_STORAGE_KEY), deleteItem(PENDING_PHONE_KEY)])
    .then(() => callback())
    .catch(() => callback());
}
