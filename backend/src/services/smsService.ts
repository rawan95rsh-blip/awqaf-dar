/**
 * إرسال رسائل SMS (كود تحقق المركز).
 * يعمل مع Twilio إن ضُبطت المتغيرات:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (رقم أو Sender ID)
 * بدونها يُطبع الكود في سجل الخادم فقط (للتطوير).
 */
export type SmsResult = { sent: boolean; provider: 'twilio' | 'log' };

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
  );
}

export async function sendSms(phoneDigits: string, message: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    console.log(`[sms:log] to +${phoneDigits}: ${message}`);
    return { sent: false, provider: 'log' };
  }

  const body = new URLSearchParams({ To: `+${phoneDigits}`, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[sms:twilio] failed', response.status, text.slice(0, 300));
    return { sent: false, provider: 'twilio' };
  }
  return { sent: true, provider: 'twilio' };
}
