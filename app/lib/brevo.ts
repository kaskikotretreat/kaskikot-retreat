// lib/brevo.ts
// Small wrapper around Brevo's transactional email API.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_NAME = 'Kaskikot Retreat';

type Party = { email: string; name?: string };

export type EmailMessage = {
  to: Party;
  subject: string;
  html: string;
  text: string;
  replyTo?: Party;
};

export type SendResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

/** Returns the names of any required environment variables that are not set. */
export function missingEmailSettings(): string[] {
  const required = ['BREVO_API_KEY', 'SENDER_EMAIL'] as const;
  return required.filter((key) => !process.env[key]);
}

/** Where admin notifications go. Falls back to the sender address. */
export function getAdminAddress(): string {
  return process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || '';
}

/** Sends one email. Never throws: always resolves with a SendResult. */
export async function sendEmail(label: string, message: EmailMessage): Promise<SendResult> {
  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY ?? '',
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: process.env.SENDER_EMAIL },
        to: [message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      console.log(`[Brevo] ${label} email sent (${res.status})`);
      return { ok: true };
    }

    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    const reason = body.message || body.code || 'Email provider error';
    console.error(`[Brevo] ${label} email FAILED (${res.status}): ${reason}`);
    return { ok: false, status: res.status, reason };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network error';
    console.error(`[Brevo] ${label} email FAILED: ${reason}`);
    return { ok: false, status: 0, reason };
  }
}