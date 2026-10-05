// app/api/admin/security/route.ts
// Logged-in owner: change password, set up or turn off two-factor.
import { NextResponse } from 'next/server';
import { createSessionCookie, guard, isHttps } from '../../../lib/admin-auth';
import {
  clearFailures, disableTwoFactor, enableTwoFactor, isLocked, passwordProblem, passwordWasChanged,
  recordFailure, recoveryCodesLeft, setPassword, startTwoFactor, twoFactorEnabled, verifyPassword, verifySecondFactor,
} from '../../../lib/admin-security';

// 400, not 401: the page treats 401 as "logged out".
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function okWithFreshCookie(req: Request, message: string) {
  const res = NextResponse.json({ ok: true, message });
  res.headers.append('Set-Cookie', await createSessionCookie(isHttps(req))); // changing security logs others out, not you
  return res;
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    return NextResponse.json(
      { twoFactor: await twoFactorEnabled(), codesLeft: await recoveryCodesLeft(), passwordChanged: await passwordWasChanged() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('Security load error:', e);
    return bad('Could not load the security settings.', 500);
  }
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad('Invalid request.');

  try {
    switch (body.action) {
      case 'changePassword': {
        if (await isLocked('login')) return bad('Too many wrong attempts. Please wait 15 minutes.', 429);
        if (!(await verifyPassword(String(body.current ?? '')))) {
          await recordFailure('login');
          await delay(800);
          return bad('Your current password is not correct.');
        }
        const problem = passwordProblem(String(body.next ?? ''));
        if (problem) return bad(problem);
        await setPassword(String(body.next));
        await clearFailures('login');
        return okWithFreshCookie(req, 'Password changed. Other devices have been logged out.');
      }

      case 'startTwoFactor': {
        if (await twoFactorEnabled()) return bad('Two-factor authentication is already on.');
        const account = process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || 'admin';
        return NextResponse.json({ ok: true, ...(await startTwoFactor(account)) });
      }

      case 'enableTwoFactor': {
        if (await isLocked('login')) return bad('Too many wrong attempts. Please wait 15 minutes.', 429);
        const codes = await enableTwoFactor(String(body.code ?? ''));
        if (!codes) {
          await recordFailure('login');
          return bad('That code did not match. Check your phone and try again.');
        }
        return NextResponse.json({ ok: true, codes, message: 'Two-factor authentication is on.' });
      }

      case 'disableTwoFactor': {
        if (await isLocked('login')) return bad('Too many wrong attempts. Please wait 15 minutes.', 429);
        const passwordOk = await verifyPassword(String(body.password ?? ''));
        const codeOk = passwordOk && (await verifySecondFactor(String(body.code ?? '')));
        if (!passwordOk || !codeOk) {
          await recordFailure('login');
          await delay(800);
          return bad('The password or the code is not correct.');
        }
        await disableTwoFactor();
        return okWithFreshCookie(req, 'Two-factor authentication is off.');
      }

      default:
        return bad('Unknown action.');
    }
  } catch (e) {
    console.error('Security action error:', e);
    return bad('Something went wrong. Please try again.', 500);
  }
}
