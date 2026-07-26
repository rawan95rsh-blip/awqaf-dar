export type SessionMode = 'in_person' | 'online' | 'hybrid';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';

export const SESSION_MODE_LABELS: Record<SessionMode, string> = {
  in_person: 'حضوري',
  online: 'أونلاين',
  hybrid: 'حضوري وأونلاين',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'مجدولة',
  cancelled: 'ملغاة',
  completed: 'مكتملة',
};

export interface SessionItem {
  id: string;
  centerId: string;
  levelId: string | null;
  classOfferId?: string | null;
  subjectIndex: number;
  title: string;
  startAt: string;
  endAt: string;
  mode: SessionMode;
  zoomUrl?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  teacherName?: string;
  notes?: string;
  status: SessionStatus;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  /** للطالبة فقط: هل الحصة لمستواها */
  isMyLevel?: boolean;
}

export interface CreateSessionPayload {
  levelId: string;
  subjectIndex: number;
  title: string;
  startAt: string;
  endAt: string;
  mode: SessionMode;
  zoomUrl?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  teacherName?: string;
  notes?: string;
}

export type UpdateSessionPayload = Partial<CreateSessionPayload> & {
  status?: SessionStatus;
};

export interface ListSessionsParams {
  levelId?: string;
  status?: SessionStatus;
  from?: string;
  to?: string;
}
