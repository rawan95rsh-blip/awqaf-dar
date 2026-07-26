import React, { useState, useCallback, useEffect } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import type { User } from "@/src/types/auth";
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
  isStoredSessionValid,
} from "@/src/api/auth";
import { setUnauthorizedHandler } from "@/src/api/client";
import { registerForPushNotificationsAsync } from "@/src/utils/pushNotifications";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricEnabled,
} from "@/src/utils/biometric";

function tryRegisterPush() {
  void registerForPushNotificationsAsync().then((result) => {
    if (result.status === 'registered') {
      console.log('[push] device ready for external notifications');
      return;
    }
    console.warn('[push] not registered:', result.status, result.detail ?? '');
  });
}

function finishUnlockedSession(
  storedToken: string,
  storedUser: User,
  setToken: (t: string | null) => void,
  setUser: (u: User | null) => void,
  setIsLoading: (v: boolean) => void,
  onDone?: () => void,
) {
  setToken(storedToken);
  setUser(storedUser);
  setIsLoading(false);
  tryRegisterPush();
  onDone?.();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback((onDone?: () => void) => {
    clearAuthSession(() => {
      setToken(null);
      setUser(null);
      onDone?.();
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  const login = useCallback(
    (newToken: string, newUser: User, onDone?: () => void) => {
      if (!isStoredSessionValid(newToken, newUser)) {
        onDone?.();
        return;
      }
      setStoredUser(newUser, () => {
        setStoredToken(newToken, () => {
          setToken(newToken);
          setUser(newUser);
          tryRegisterPush();
          onDone?.();
        });
      });
    },
    [],
  );

  const restoreSession = useCallback((onDone?: () => void) => {
    getStoredToken((storedToken) => {
      getStoredUser((storedUser) => {
        if (!isStoredSessionValid(storedToken, storedUser)) {
          if (storedToken || storedUser) {
            clearAuthSession(() => {
              setToken(null);
              setUser(null);
              setIsLoading(false);
              onDone?.();
            });
            return;
          }

          setToken(null);
          setUser(null);
          setIsLoading(false);
          onDone?.();
          return;
        }

        void (async () => {
          const [enabled, availability] = await Promise.all([
            getBiometricEnabled(),
            getBiometricAvailability(),
          ]);

          if (!enabled || !availability.available) {
            finishUnlockedSession(
              storedToken!,
              storedUser!,
              setToken,
              setUser,
              setIsLoading,
              onDone,
            );
            return;
          }

          const auth = await authenticateWithBiometrics(
            `فتح التطبيق بـ ${availability.label}`,
          );
          if (auth.success) {
            finishUnlockedSession(
              storedToken!,
              storedUser!,
              setToken,
              setUser,
              setIsLoading,
              onDone,
            );
            return;
          }

          // الجلسة تبقى في SecureStore؛ الحالة غير مفتوحة → شاشة الترحيب/الدخول بكلمة المرور
          setToken(null);
          setUser(null);
          setIsLoading(false);
          onDone?.();
        })();
      });
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
