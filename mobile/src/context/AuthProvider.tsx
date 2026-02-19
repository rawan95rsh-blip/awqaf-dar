import React, { useState, useCallback } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import type { User } from "@/src/types/auth";
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
} from "@/src/api/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(
    (newToken: string, newUser: User, onDone?: () => void) => {
      setStoredUser(newUser, () => {
        setStoredToken(newToken, () => {
          setToken(newToken);
          setUser(newUser);
          onDone?.();
        });
      });
    },
    [],
  );

  const logout = useCallback((onDone?: () => void) => {
    removeStoredUser(() => {
      removeStoredToken(() => {
        setToken(null);
        setUser(null);
        onDone?.();
      });
    });
  }, []);

  const restoreSession = useCallback((onDone?: () => void) => {
    getStoredToken((storedToken) => {
      if (storedToken) {
        getStoredUser((storedUser) => {
          setToken(storedToken);
          setUser(storedUser ?? {});
          setIsLoading(false);
          onDone?.();
        });
      } else {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        onDone?.();
      }
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
