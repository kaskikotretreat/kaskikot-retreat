// app/api/admin/reset/route.ts
// Forgot password. The link is only ever emailed to the admin address (ADMIN_EMAIL), never to an address typed in.
import { NextResponse } from 'next/server';
import { adminConfigured, sameOrigin } from '../../../lib/admin-auth';
import { clearFailures, consumeResetToken, createResetToken, isLocked, passwordProblem, recordFailure, setPassword } from '../../../lib/admin-security';
import { missingEmailSettings, sendEmail } from '../../../lib/brevo';
import { buildResetEmail } from '../../../lib/email-templates';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return bad('Blocked.', 403);
    if (!(await adminConfigured())) return bad('The admin password has not been set up yet.', 503);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (body?.action === 'request') {
      const to = process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || '';
      if (!to || missingEmailSettings().length > 0) return bad('Email is not set up, so a reset link cannot be sent.', 503);

      const reply = NextResponse.json({ ok: true, message: 'A reset link is on its way. It works once and expires in 30 minutes.' });
      if (await isLocked('reset', 3, 60 * 60_000)) return reply; // same answer, nothing sent
      await recordFailure('reset'); // counts requests, so nobody can flood the inbox

      const origin = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
      const link = `${origin}/admin/reset?token=${await createResetToken()}`;
      await sendEmail('Reset', { to: { email: to }, ...buildResetEmail(link) });
      return reply;
    }

    if (body?.action === 'complete') {
      if (await isLocked('reset-submit')) return bad('Too many attempts. Please wait 15 minutes.', 429);
      const problem = passwordProblem(String(body.password ?? ''));
      if (problem) return bad(problem);
      if (!(await consumeResetToken(String(body.token ?? '')))) {
        await recordFailure('reset-submit');
        return bad('This link is not valid any more. Please ask for a new one.');
      }
      await setPassword(String(body.password));
      await clearFailures('login');
      return NextResponse.json({ ok: true, message: 'Your password has been changed.' });
    }
    return bad('Invalid request.');
  } catch (e) {
    console.error('Reset error:', e);
    return bad('Something went wrong. Please try again.', 500);
  }
}
