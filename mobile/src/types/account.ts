import type { User } from '@/src/types/auth';

export interface AccountCenter {
  id: string;
  nameAr: string;
  supervisorName: string;
  specializations: string[];
  status: string;
}

export interface AccountUser {
  id: string;
  phone: string;
  email?: string;
  role: 'center_admin' | 'student';
  isActive: boolean;
}

export interface AccountResponse {
  user: AccountUser;
  center: AccountCenter | null;
}

export interface UpdateAccountPayload {
  supervisorName?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function mapAccountToUser(account: AccountResponse): User {
  return {
    id: account.user.id,
    phone: account.user.phone,
    email: account.user.email,
    role: account.user.role,
    centerProfile: account.center
      ? {
          id: account.center.id,
          nameAr: account.center.nameAr,
        }
      : undefined,
  };
}
