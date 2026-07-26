import mongoose from 'mongoose';
import { DeviceToken } from '../models/DeviceToken';
import {
  Notification,
  type NotificationType,
} from '../models/Notification';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** يجب أن يطابق قناة أندرويد في الموبايل */
const ANDROID_CHANNEL_ID = 'awqaf-dar-default';

export type PushPayload = {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  centerId?: mongoose.Types.ObjectId | null;
};

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
  );
}

/** إرسال دفعة إلى Expo Push API — لا يرمي إن فشل الشبكة */
async function sendExpoPushMessages(
  messages: Array<{
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string;
    channelId?: string;
    priority?: string;
  }>
): Promise<{ ticketCount: number; errors: string[] }> {
  if (messages.length === 0) {
    return { ticketCount: 0, errors: [] };
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('[pushService] Expo HTTP', response.status, text);
      return { ticketCount: 0, errors: [`http_${response.status}`] };
    }

    let parsed: {
      data?: Array<{ status?: string; message?: string; details?: unknown }>;
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      console.error('[pushService] Expo invalid JSON', text);
      return { ticketCount: 0, errors: ['invalid_json'] };
    }

    const tickets = Array.isArray(parsed.data) ? parsed.data : [];
    const errors: string[] = [];
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        const msg = ticket.message ?? 'unknown_ticket_error';
        errors.push(msg);
        console.error('[pushService] Expo ticket error', msg, ticket.details);
      }
    }

    console.log(
      `[pushService] sent=${messages.length} tickets=${tickets.length} errors=${errors.length}`
    );
    return { ticketCount: tickets.length, errors };
  } catch (err) {
    console.error('[pushService] Expo request failed', err);
    return { ticketCount: 0, errors: ['network_error'] };
  }
}

/**
 * يحفظ إشعاراً في الـ Inbox ويحاول Push لكل أجهزة المستخدمين.
 */
export async function notifyUsers(
  userIds: mongoose.Types.ObjectId[],
  payload: PushPayload
): Promise<{
  inboxCount: number;
  pushAttempted: number;
  pushTicketCount: number;
  pushErrors: string[];
}> {
  const uniqueIds = [
    ...new Map(userIds.map((id) => [id.toString(), id])).values(),
  ];
  if (uniqueIds.length === 0) {
    return {
      inboxCount: 0,
      pushAttempted: 0,
      pushTicketCount: 0,
      pushErrors: [],
    };
  }

  const docs = uniqueIds.map((userId) => ({
    userId,
    centerId: payload.centerId ?? null,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  await Notification.insertMany(docs);

  const tokens = await DeviceToken.find({
    userId: { $in: uniqueIds },
  })
    .select('expoPushToken')
    .lean();

  const validTokens = [
    ...new Set(
      tokens
        .map((t) => t.expoPushToken)
        .filter((t): t is string => typeof t === 'string' && isExpoPushToken(t))
    ),
  ];

  const messages = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    sound: 'default' as const,
    priority: 'high',
    channelId: ANDROID_CHANNEL_ID,
    data: {
      type: payload.type,
      ...(payload.data ?? {}),
    },
  }));

  const sendResult = await sendExpoPushMessages(messages);

  return {
    inboxCount: docs.length,
    pushAttempted: messages.length,
    pushTicketCount: sendResult.ticketCount,
    pushErrors: sendResult.errors,
  };
}
