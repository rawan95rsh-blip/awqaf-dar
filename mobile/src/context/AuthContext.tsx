import { createContext, useContext } from 'react';
import type { AuthContextValue } from '@/src/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value == null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
