// app/lib/admin-auth.ts
// Login cookies for the admin page. Needs ADMIN_SECRET (a long random string) in the environment.
import { NextResponse } from 'next/server';
import { getEpoch, passwordConfigured, safeEqual } from './admin-security';

const COOKIE = 'kk_admin';
const SESSION_SECONDS = 60 * 60 * 12; // stay logged in for 12 hours
const TICKET_SECONDS = 60 * 5; // time allowed to type the two-factor code
const encoder = new TextEncoder();

async function sign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(process.env.ADMIN_SECRET ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const secretConfigured = () => (process.env.ADMIN_SECRET ?? '').length >= 16;
export const adminConfigured = async () => secretConfigured() && (await passwordConfigured());
export const isHttps = (req: Request) => new URL(req.url).protocol === 'https:';

/** A signed value that expires. `kind` keeps login cookies and two-factor tickets from being swapped. */
async function makeToken(kind: 'session' | 'ticket', seconds: number): Promise<string> {
  const expires = Date.now() + seconds * 1000;
  const epoch = await getEpoch();
  return `${expires}.${epoch}.${await sign(`${kind}:${expires}:${epoch}`)}`;
}

async function checkToken(kind: 'session' | 'ticket', token: string): Promise<boolean> {
  const [expires, epoch, signature] = token.split('.');
  if (!expires || !epoch || !signature || Number(expires) < Date.now()) return false;
  if (!safeEqual(epoch, await getEpoch())) return false; // password or 2FA changed since: log in again
  return safeEqual(signature, await sign(`${kind}:${expires}:${epoch}`));
}

export const createTicket = () => makeToken('ticket', TICKET_SECONDS);
export const verifyTicket = (ticket: string) => checkToken('ticket', ticket).catch(() => false);

export async function createSessionCookie(secure: boolean): Promise<string> {
  return `${COOKIE}=${await makeToken('session', SESSION_SECONDS)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}
export const clearSessionCookie = (secure: boolean) =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;

export async function isAdmin(req: Request): Promise<boolean> {
  if (!secretConfigured()) return false;
  const cookie = (req.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!cookie) return false;
  try {
    return await checkToken('session', cookie.slice(COOKIE.length + 1));
  } catch {
    return false;
  }
}

/** Rejects requests from other websites (for anything that changes data). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || new URL(origin).host === req.headers.get('host');
}

/** Returns an error response when the caller is not allowed in, otherwise null. */
export async function guard(req: Request): Promise<NextResponse | null> {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  if (req.method !== 'GET' && !sameOrigin(req)) return NextResponse.json({ error: 'Blocked.' }, { status: 403 });
  return null;
}
