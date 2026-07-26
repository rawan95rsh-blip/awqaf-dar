export interface User {
  id?: string;
  email?: string;
  phone?: string;
  role?: 'center_admin' | 'student';
  centerProfile?: {
    id?: string;
    nameAr?: string;
  };
  studentProfile?: {
    id?: string;
    fullName?: string;
    idNumber?: string;
    nationality?: string;
    academicLevel?: string;
    levelId?: string;
  };
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, onDone?: () => void) => void;
  logout: (onDone?: () => void) => void;
  restoreSession: (onDone?: () => void) => void;
}
