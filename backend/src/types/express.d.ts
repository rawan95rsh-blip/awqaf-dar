import type { Types } from 'mongoose';

export interface AuthUser {
  _id: Types.ObjectId;
  phone: string;
  role: 'center_admin' | 'student';
  centerId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  isActive: boolean;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
