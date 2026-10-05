// app/api/admin/session/route.ts
// GET: am I logged in?   POST: log in (password, then the 6-digit code if two-factor is on).   DELETE: log out.
import { NextResponse } from 'next/server';
import { adminConfigured, clearSessionCookie, createSessionCookie, createTicket, isAdmin, isHttps, sameOrigin, secretConfigured, verifyTicket } from '../../../lib/admin-auth';
import { clearFailures, isLocked, recordFailure, twoFactorEnabled, verifyPassword, verifySecondFactor } from '../../../lib/admin-security';

const NO_STORE = { 'Cache-Control': 'no-store' };
const err = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** k***@gmail.com, so the login page can say where a reset link would go without exposing the address. */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '';
  return `${name[0]}${'*'.repeat(Math.max(2, name.length - 1))}@${domain}`;
}

async function loggedIn(req: Request) {
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  res.headers.append('Set-Cookie', await createSessionCookie(isHttps(req)));
  return res;
}

export async function GET(req: Request) {
  try {
    return NextResponse.json(
      {
        authed: await isAdmin(req),
        configured: await adminConfigured(),
        resetHint: maskEmail(process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || ''),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    console.error('Session check error:', e);
    return NextResponse.json({ authed: false, configured: secretConfigured(), resetHint: '' }, { headers: NO_STORE });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await adminConfigured())) return err('The admin password has not been set up yet.', 503);
    if (!sameOrigin(req)) return err('Blocked.', 403);
    if (await isLocked('login')) return err('Too many wrong attempts. Please wait 15 minutes and try again.', 429);

    const body = (await req.json().catch(() => null)) as { password?: unknown; ticket?: unknown; code?: unknown } | null;

    // Step 2: the code from the phone (or a recovery code)
    if (body?.ticket) {
      if (!(await verifyTicket(String(body.ticket)))) return err('That sign-in took too long. Please start again.', 401);
      if (!(await verifySecondFactor(String(body.code ?? '')))) {
        await recordFailure('login');
        await delay(800);
        return err('That code is not correct.', 401);
      }
      await clearFailures('login');
      return loggedIn(req);
    }

    // Step 1: the password
    if (!(await verifyPassword(String(body?.password ?? '')))) {
      await recordFailure('login');
      await delay(800);
      return err('Wrong password.', 401);
    }
    if (await twoFactorEnabled()) {
      return NextResponse.json({ needsCode: true, ticket: await createTicket() }, { headers: NO_STORE });
    }
    await clearFailures('login');
    return loggedIn(req);
  } catch (e) {
    console.error('Login error:', e);
    return err('Could not sign in. If this is the first time, run schema.sql to add the security tables.', 500);
  }
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  res.headers.append('Set-Cookie', clearSessionCookie(isHttps(req)));
  return res;
}
