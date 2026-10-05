// app/lib/admin-security.ts
// Password (changeable), authenticator-app two-factor, sign-in limits and password-reset links.
import { getDb } from './db';

const encoder = new TextEncoder();

// ─── Small helpers ───────────────────────────────────────────────────────────

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
function fromHex(hex: string) {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
const randomHex = (bytes: number) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

/** Compares two strings without stopping at the first difference. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))));
}

// ─── Settings stored in the database ─────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const { results } = await getDb().prepare('SELECT value FROM admin_settings WHERE key = ?1').bind(key).all<{ value: string }>();
  return results[0]?.value ?? null;
}
async function setSetting(key: string, value: string) {
  await getDb()
    .prepare('INSERT INTO admin_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value)
    .run();
}
async function deleteSettings(...keys: string[]) {
  for (const key of keys) await getDb().prepare('DELETE FROM admin_settings WHERE key = ?1').bind(key).run();
}

/** Every login cookie carries this number. Changing it logs everyone out. */
export async function getEpoch(): Promise<string> {
  return (await getSetting('session_epoch')) ?? '1';
}
export async function bumpEpoch() {
  await setSetting('session_epoch', String(Number(await getEpoch()) + 1));
}

// ─── Password ────────────────────────────────────────────────────────────────

// Kept moderate so it stays fast on the free Workers plan. Sign-in limits protect against guessing.
const PBKDF2_ITERATIONS = 10_000;

async function pbkdf2(password: string, salt: BufferSource, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

/** The password set from the admin page wins. Until one is set, ADMIN_PASSWORD from the environment is used. */
export async function verifyPassword(input: string): Promise<boolean> {
  const stored = await getSetting('password_hash');
  if (stored) {
    const [, iterations, salt, hash] = stored.split('$');
    return safeEqual(await pbkdf2(input, fromHex(salt), Number(iterations)), hash);
  }
  const fromEnv = process.env.ADMIN_PASSWORD ?? '';
  if (!fromEnv) return false;
  return safeEqual(await sha256Hex(input), await sha256Hex(fromEnv));
}

export async function passwordConfigured(): Promise<boolean> {
  return !!process.env.ADMIN_PASSWORD || !!(await getSetting('password_hash'));
}
export async function passwordWasChanged(): Promise<boolean> {
  return !!(await getSetting('password_hash'));
}

export function passwordProblem(password: string): string | null {
  return password.length >= 12 ? null : 'Use at least 12 characters. A few random words works well.';
}

/** Saves a new password and logs out every other session. */
export async function setPassword(password: string) {
  await setSetting('password_hash', await hashPassword(password));
  await bumpEpoch();
}

// ─── Limits on guessing ──────────────────────────────────────────────────────

export async function isLocked(kind: string, max = 5, windowMs = 15 * 60_000): Promise<boolean> {
  const { results } = await getDb()
    .prepare('SELECT COUNT(*) AS n FROM admin_attempts WHERE kind = ?1 AND at > ?2')
    .bind(kind, Date.now() - windowMs)
    .all<{ n: number }>();
  return (results[0]?.n ?? 0) >= max;
}
export async function recordFailure(kind: string) {
  const db = getDb();
  await db.prepare('INSERT INTO admin_attempts (kind, at) VALUES (?1, ?2)').bind(kind, Date.now()).run();
  await db.prepare('DELETE FROM admin_attempts WHERE at < ?1').bind(Date.now() - 86_400_000).run();
}
export async function clearFailures(kind: string) {
  await getDb().prepare('DELETE FROM admin_attempts WHERE kind = ?1').bind(kind).run();
}

// ─── Two-factor (authenticator app, standard 6-digit codes) ──────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string) {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of text.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const bytes = new Uint8Array(out.length);
  bytes.set(out);
  return bytes;
}

export async function hotp(secret: BufferSource, counter: number, digits = 6): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const o = h[19] & 15;
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** Returns the time step that matched, or null. Steps at or before `lastStep` are refused, so a code works only once. */
export async function verifyTotp(secretB32: string, code: string, lastStep = 0): Promise<number | null> {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const secret = base32Decode(secretB32);
  const now = Math.floor(Date.now() / 30_000);
  for (const delta of [-1, 0, 1]) {
    const step = now + delta;
    if (step > lastStep && safeEqual(await hotp(secret, step), clean)) return step;
  }
  return null;
}

export async function twoFactorEnabled(): Promise<boolean> {
  return !!(await getSetting('totp_secret'));
}

export async function startTwoFactor(account: string) {
  const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
  await setSetting('totp_pending', secret);
  const issuer = 'Kaskikot Retreat';
  const uri = `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return { secret, uri };
}

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike letters or digits

async function newRecoveryCodes(): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () => {
    const s = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
  await setSetting('recovery_codes', JSON.stringify(await Promise.all(codes.map(sha256Hex))));
  return codes;
}

/** Checks the code from the phone, then turns two-factor on. Returns the one-time recovery codes, or null if the code was wrong. */
export async function enableTwoFactor(code: string): Promise<string[] | null> {
  const pending = await getSetting('totp_pending');
  if (!pending) return null;
  const step = await verifyTotp(pending, code);
  if (step === null) return null;
  await setSetting('totp_secret', pending);
  await setSetting('totp_last_step', String(step));
  await deleteSettings('totp_pending');
  return newRecoveryCodes();
}

async function consumeRecoveryCode(input: string): Promise<boolean> {
  const clean = input.trim().toLowerCase();
  if (!/^[a-z2-9]{5}-?[a-z2-9]{5}$/.test(clean)) return false;
  const code = clean.includes('-') ? clean : `${clean.slice(0, 5)}-${clean.slice(5)}`;
  const hashes: string[] = JSON.parse((await getSetting('recovery_codes')) ?? '[]');
  const index = hashes.indexOf(await sha256Hex(code));
  if (index < 0) return false;
  hashes.splice(index, 1);
  await setSetting('recovery_codes', JSON.stringify(hashes));
  return true;
}

export async function recoveryCodesLeft(): Promise<number> {
  return (JSON.parse((await getSetting('recovery_codes')) ?? '[]') as string[]).length;
}

/** Accepts the 6-digit code from the phone, or one of the recovery codes (each works once). */
export async function verifySecondFactor(input: string): Promise<boolean> {
  const secret = await getSetting('totp_secret');
  if (!secret) return false;
  const step = await verifyTotp(secret, input, Number((await getSetting('totp_last_step')) ?? 0));
  if (step !== null) {
    await setSetting('totp_last_step', String(step));
    return true;
  }
  return consumeRecoveryCode(input);
}

export async function disableTwoFactor() {
  await deleteSettings('totp_secret', 'totp_pending', 'totp_last_step', 'recovery_codes');
  await bumpEpoch();
}

// ─── Password reset links (emailed) ──────────────────────────────────────────

/** Makes a one-time link token valid for 30 minutes. Older links stop working. */
export async function createResetToken(): Promise<string> {
  const db = getDb();
  const token = randomHex(32);
  await db.prepare('DELETE FROM admin_reset_tokens').run();
  await db
    .prepare('INSERT INTO admin_reset_tokens (hash, expires_at) VALUES (?1, ?2)')
    .bind(await sha256Hex(token), Date.now() + 30 * 60_000)
    .run();
  return token;
}

/** Uses up a token. Returns true only the first time, and only while it is still valid. */
export async function consumeResetToken(token: string): Promise<boolean> {
  const res = await getDb()
    .prepare('UPDATE admin_reset_tokens SET used = 1 WHERE hash = ?1 AND used = 0 AND expires_at > ?2')
    .bind(await sha256Hex(token), Date.now())
    .run();
  return res.meta.changes === 1;
}
