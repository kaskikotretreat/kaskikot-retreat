// app/api/booking/route.ts
import { NextResponse } from 'next/server';
import { getAdminAddress, missingEmailSettings, sendEmail } from '../../lib/brevo';
import {
  BRAND,
  buildAdminEmail,
  buildGuestEmail,
  countNights,
  type Booking,
} from '../../lib/email-templates';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR =
  'We could not send your request right now. Please try again in a moment or contact us directly.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Trim, collapse whitespace and limit length (keeps headers and emails tidy). */
const clean = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

function makeReference(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KK-${date}-${code}`;
}

/** JSON error response. Set DEBUG_BOOKING=true to also show technical detail. */
function fail(message: string, status: number, detail?: string) {
  const showDetail = process.env.DEBUG_BOOKING === 'true' && detail;
  return NextResponse.json({ error: showDetail ? `${message} (${detail})` : message }, { status });
}

/** Validates and normalises the form data. */
function parseBooking(raw: Record<string, unknown>): { booking: Booking } | { error: string } {
  const name = clean(raw.name, 100);
  const email = clean(raw.email, 150).toLowerCase();
  const phone = clean(raw.phone, 30);
  const nationality = clean(raw.nationality, 60);
  const checkIn = clean(raw.checkIn, 10);
  const checkOut = clean(raw.checkOut, 10);

  if (!name || !phone || !nationality) return { error: 'Please fill in all required fields.' };
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) {
    return { error: 'Please choose valid check-in and check-out dates.' };
  }

  // Allow "yesterday" in UTC so guests in Nepal (UTC+5:45) can still pick today.
  const earliest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (checkIn < earliest) return { error: 'Check-in date cannot be in the past.' };

  const nights = countNights(checkIn, checkOut);
  if (nights < 1) return { error: 'Check-out must be after check-in.' };

  return {
    booking: {
      reference: makeReference(),
      name,
      email,
      phone,
      nationality,
      guests: Math.min(10, Math.max(1, parseInt(String(raw.guests), 10) || 1)),
      roomType: clean(raw.roomType, 60) || 'Standard Room',
      checkIn,
      checkOut,
      nights,
      arrivalTime: clean(raw.arrivalTime, 40),
      specialRequests: String(raw.specialRequests ?? '').trim().slice(0, 1000),
    },
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Open /api/booking in a browser to check the route and environment settings. */
export async function GET() {
  const missing = missingEmailSettings();
  return NextResponse.json({
    route: 'ok',
    emailSettings: missing.length === 0 ? 'loaded' : `MISSING: ${missing.join(', ')}`,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'loaded' : 'not set (using SENDER_EMAIL)',
  });
}

export async function POST(req: Request) {
  try {
    const missing = missingEmailSettings();
    if (missing.length > 0) {
      console.error(`Missing environment settings: ${missing.join(', ')}`);
      return fail(GENERIC_ERROR, 500, `missing ${missing.join(', ')}`);
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') return fail('Invalid request.', 400);

    const parsed = parseBooking(raw as Record<string, unknown>);
    if ('error' in parsed) return fail(parsed.error, 400);
    const { booking } = parsed;

    const guestEmail = buildGuestEmail(booking);
    const adminEmail = buildAdminEmail(booking);

    const [guestResult, adminResult] = await Promise.all([
      sendEmail('Guest', {
        to: { email: booking.email, name: booking.name },
        ...guestEmail,
      }),
      sendEmail('Admin', {
        to: { email: getAdminAddress(), name: `${BRAND.shortName} Bookings` },
        replyTo: { email: booking.email, name: booking.name },
        ...adminEmail,
      }),
    ]);

    // The admin email is the one that matters: without it the booking is lost.
    if (!adminResult.ok) {
      return fail(GENERIC_ERROR, 502, `Brevo: ${adminResult.reason}`);
    }

    return NextResponse.json({
      message: 'Booking request sent successfully!',
      reference: booking.reference,
      guestEmailSent: guestResult.ok,
    });
  } catch (err) {
    console.error('Internal error:', err);
    return fail(GENERIC_ERROR, 500, err instanceof Error ? err.message : 'Unknown error');
  }
}