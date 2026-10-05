// app/api/admin/route.ts
// GET: everything the admin page shows.  POST: one change, chosen by `action`.
import { NextResponse } from 'next/server';
import { guard } from '../../lib/admin-auth';
import {
  addBlock, adminSnapshot, deleteBlock, deletePackage, getBooking, roomExists,
  savePackage, saveRoom, setBookingStatus, type AdminBooking,
} from '../../lib/admin-db';
import { missingEmailSettings, sendEmail } from '../../lib/brevo';
import { buildStatusEmail, countNights, type Booking } from '../../lib/email-templates';

const ID = /^[a-z0-9_-]{1,60}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const int = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ok = (message?: string) => NextResponse.json({ ok: true, message });

function toBooking(b: AdminBooking): Booking {
  return {
    reference: b.reference,
    name: b.name ?? 'Guest',
    email: b.email ?? '',
    phone: b.phone ?? '',
    nationality: b.nationality ?? '',
    guests: b.guests ?? 1,
    roomType: b.roomName,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: countNights(b.checkIn, b.checkOut),
    arrivalTime: b.arrivalTime ?? '',
    specialRequests: b.specialRequests ?? '',
    price: b.totalPrice != null ? { total: b.totalPrice, label: b.priceNote ?? '' } : undefined,
  };
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await adminSnapshot(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Admin load error:', err);
    return bad('Could not load the data.', 500);
  }
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad('Invalid request.');

  try {
    switch (body.action) {
      case 'saveRoom': {
        const name = text(body.name, 60);
        const rate = int(body.nightlyRate, 0, 10_000_000);
        const id = body.id ? text(body.id, 60) : undefined;
        if (!name) return bad('Please enter a room name.');
        if (rate === null) return bad('The price must be a whole number of rupees.');
        if (id && (!ID.test(id) || !(await roomExists(id)))) return bad('That room was not found.');
        await saveRoom({ id, name, description: text(body.description, 140), nightlyRate: rate, active: body.active !== false });
        return ok(id ? 'Room saved.' : 'Room added.');
      }

      case 'savePackage': {
        const roomId = text(body.roomId, 60);
        const name = text(body.name, 60);
        const nights = int(body.nights, 1, 365);
        const price = int(body.price, 0, 100_000_000);
        const id = body.id ? text(body.id, 60) : undefined;
        if (!(await roomExists(roomId))) return bad('That room was not found.');
        if (!name) return bad('Please enter a package name.');
        if (nights === null) return bad('Nights must be a whole number from 1 to 365.');
        if (price === null) return bad('The price must be a whole number of rupees.');
        if (id && !ID.test(id)) return bad('That package was not found.');
        await savePackage({ id, roomId, name, nights, price, active: body.active !== false });
        return ok('Package saved.');
      }

      case 'deletePackage': {
        const id = text(body.id, 60);
        if (!ID.test(id)) return bad('That package was not found.');
        await deletePackage(id);
        return ok('Package removed.');
      }

      case 'setStatus': {
        const id = int(body.id, 1, 1_000_000_000);
        const status = body.status;
        if (id === null || (status !== 'confirmed' && status !== 'declined' && status !== 'cancelled')) return bad('Invalid request.');
        if (!(await setBookingStatus(id, status))) return bad('This booking was already updated. Please refresh the page.', 409);

        let message = status === 'confirmed' ? 'Booking confirmed.' : status === 'declined' ? 'Request declined.' : 'Booking cancelled.';
        if (body.emailGuest && status !== 'cancelled') {
          const row = await getBooking(id);
          if (row?.email && missingEmailSettings().length === 0) {
            const sent = await sendEmail('Status', { to: { email: row.email, name: row.name ?? '' }, ...buildStatusEmail(toBooking(row), status) });
            message += sent.ok ? ' The guest was emailed.' : ' The email to the guest could not be sent.';
          } else {
            message += ' The guest was not emailed.';
          }
        }
        return ok(message);
      }

      case 'addBlock': {
        const roomId = text(body.roomId, 60);
        const checkIn = text(body.checkIn, 10);
        const checkOut = text(body.checkOut, 10);
        if (!(await roomExists(roomId))) return bad('Please choose a room.');
        if (!ISO.test(checkIn) || !ISO.test(checkOut)) return bad('Please choose both dates.');
        const nights = countNights(checkIn, checkOut);
        if (nights < 1 || nights > 365) return bad('The last night must be after the first night.');
        if (!(await addBlock(roomId, checkIn, checkOut, text(body.note, 60) || 'Blocked'))) {
          return bad('Some of those dates are already booked or blocked.', 409);
        }
        return ok('Dates blocked.');
      }

      case 'deleteBlock': {
        const id = int(body.id, 1, 1_000_000_000);
        if (id === null) return bad('Invalid request.');
        await deleteBlock(id);
        return ok('Dates are open again.');
      }

      default:
        return bad('Unknown action.');
    }
  } catch (err) {
    console.error('Admin action error:', err);
    return bad('Something went wrong. Please try again.', 500);
  }
}
