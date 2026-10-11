import axios from 'axios';
import { getItem } from '@/src/utils/storage';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** رابط كامل لمسار في الـ API (للصور والمرفقات) */
export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthCall = url.includes('/api/auth/');
    if (error.response?.status === 401 && onUnauthorized && !isAuthCall) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'استغرق الاتصال وقتاً طويلاً — حاولي مرة أخرى';
    }
    if (!error.response) {
      if (__DEV__) {
        return `تعذّر الاتصال بالخادم (${API_URL}). تأكدي أن الخادم يعمل وأن EXPO_PUBLIC_API_URL صحيح.`;
      }
      return 'تعذّر الاتصال بالخادم — تحقّقي من اتصال الإنترنت';
    }
    const data = error.response.data;
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
    if (error.response.status >= 500) return 'حدث خطأ في الخادم — حاولي لاحقاً';
  }
  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع';
}

/** يغلف طلب API ويحوّل الخطأ لرسالة عربية واضحة */
export async function request<T>(fn: () => Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  try {
    const response = await fn();
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
