export interface User {
  id?: string;
  email?: string;
  phone?: string;
  centerProfile?: {
    nameAr?: string;
  };
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** يُستدعى عند انتهاء الحفظ — تأكيد تام. */
  login: (token: string, user: User, onDone?: () => void) => void;
  /** يُستدعى عند انتهاء الخروج — تأكيد تام. */
  logout: (onDone?: () => void) => void;
  /** يُستدعى عند انتهاء استعادة الجلسة — تأكيد تام. */
  restoreSession: (onDone?: () => void) => void;
}
