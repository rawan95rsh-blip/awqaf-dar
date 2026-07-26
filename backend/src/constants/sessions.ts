export const SESSION_MODES = ['in_person', 'online', 'hybrid'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const SESSION_STATUSES = ['scheduled', 'cancelled', 'completed'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

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

export function isSessionMode(value: unknown): value is SessionMode {
  return typeof value === 'string' && (SESSION_MODES as readonly string[]).includes(value);
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return typeof value === 'string' && (SESSION_STATUSES as readonly string[]).includes(value);
}

export function parseSessionDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/** رابط Zoom اختيارياً — إن وُجد يجب أن يكون HTTPS */
export function normalizeZoomUrl(value: unknown): string | undefined | 'invalid' {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return 'invalid';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return 'invalid';
    }
    return url.toString();
  } catch {
    return 'invalid';
  }
}
