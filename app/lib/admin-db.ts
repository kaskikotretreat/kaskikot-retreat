// app/lib/admin-db.ts
// Everything the admin page can read or change in the database.
import { getDb } from './db';

export type AdminRoom = { id: string; name: string; description: string | null; nightlyRate: number; active: boolean };
export type AdminPackage = { id: string; roomId: string; name: string; nights: number; price: number; active: boolean };
export type AdminBooking = {
  id: number;
  reference: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  guests: number | null;
  arrivalTime: string | null;
  specialRequests: string | null;
  totalPrice: number | null;
  priceNote: string | null;
  createdAt: string;
};

const HOLDS = "('pending','confirmed','blocked')";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'item';

const BOOKING_SELECT = `SELECT b.id, b.reference, b.room_id AS roomId, r.name AS roomName, b.check_in AS checkIn,
  b.check_out AS checkOut, b.status, b.guest_name AS name, b.guest_email AS email, b.guest_phone AS phone,
  b.nationality, b.guests, b.arrival_time AS arrivalTime, b.special_requests AS specialRequests,
  b.total_price AS totalPrice, b.price_note AS priceNote, b.created_at AS createdAt
  FROM bookings b JOIN rooms r ON r.id = b.room_id`;

async function uniqueId(table: 'rooms' | 'packages', base: string): Promise<string> {
  const { results } = await getDb()
    .prepare(`SELECT id FROM ${table} WHERE id = ?1 OR id LIKE ?2`)
    .bind(base, `${base}-%`)
    .all<{ id: string }>();
  const taken = new Set(results.map((r) => r.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export async function adminSnapshot() {
  const db = getDb();
  const [rooms, packages, bookings] = await Promise.all([
    db.prepare('SELECT id, name, description, nightly_rate AS nightlyRate, active FROM rooms ORDER BY sort, name')
      .all<Omit<AdminRoom, 'active'> & { active: number }>(),
    db.prepare('SELECT id, room_id AS roomId, name, nights, price, active FROM packages ORDER BY room_id, sort, nights')
      .all<Omit<AdminPackage, 'active'> & { active: number }>(),
    db.prepare(`${BOOKING_SELECT} ORDER BY b.created_at DESC LIMIT 400`).all<AdminBooking>(),
  ]);
  return {
    rooms: rooms.results.map((r) => ({ ...r, active: r.active === 1 })),
    packages: packages.results.map((p) => ({ ...p, active: p.active === 1 })),
    bookings: bookings.results,
  };
}

export async function roomExists(id: string): Promise<boolean> {
  const { results } = await getDb().prepare('SELECT 1 AS x FROM rooms WHERE id = ?1').bind(id).all();
  return results.length > 0;
}

export async function saveRoom(r: { id?: string; name: string; description: string; nightlyRate: number; active: boolean }) {
  const db = getDb();
  if (r.id) {
    await db
      .prepare('UPDATE rooms SET name = ?2, description = ?3, nightly_rate = ?4, active = ?5 WHERE id = ?1')
      .bind(r.id, r.name, r.description || null, r.nightlyRate, r.active ? 1 : 0)
      .run();
    return r.id;
  }
  const id = await uniqueId('rooms', slug(r.name));
  await db
    .prepare(
      `INSERT INTO rooms (id, name, description, nightly_rate, active, sort)
       VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(sort), 0) + 1 FROM rooms))`,
    )
    .bind(id, r.name, r.description || null, r.nightlyRate, r.active ? 1 : 0)
    .run();
  return id;
}

export async function savePackage(p: { id?: string; roomId: string; name: string; nights: number; price: number; active: boolean }) {
  const db = getDb();
  if (p.id) {
    await db
      .prepare('UPDATE packages SET name = ?2, nights = ?3, price = ?4, active = ?5 WHERE id = ?1 AND room_id = ?6')
      .bind(p.id, p.name, p.nights, p.price, p.active ? 1 : 0, p.roomId)
      .run();
    return p.id;
  }
  const id = await uniqueId('packages', `${p.roomId}-${p.nights}`);
  await db
    .prepare(
      `INSERT INTO packages (id, room_id, name, nights, price, active, sort)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, (SELECT COALESCE(MAX(sort), 0) + 1 FROM packages WHERE room_id = ?2))`,
    )
    .bind(id, p.roomId, p.name, p.nights, p.price, p.active ? 1 : 0)
    .run();
  return id;
}

export async function deletePackage(id: string) {
  await getDb().prepare('DELETE FROM packages WHERE id = ?1').bind(id).run();
}

const ALLOWED_FROM = { confirmed: ['pending'], declined: ['pending'], cancelled: ['pending', 'confirmed'] } as const;

/** Moves a booking to a new status, only from an allowed earlier status. Returns false if it was already changed. */
export async function setBookingStatus(id: number, status: keyof typeof ALLOWED_FROM): Promise<boolean> {
  const from = ALLOWED_FROM[status].map((s) => `'${s}'`).join(',');
  const res = await getDb()
    .prepare(`UPDATE bookings SET status = ?2 WHERE id = ?1 AND status IN (${from})`)
    .bind(id, status)
    .run();
  return res.meta.changes === 1;
}

/** Blocks dates (phone booking, Airbnb, maintenance) unless something already holds them. */
export async function addBlock(roomId: string, checkIn: string, checkOut: string, note: string): Promise<boolean> {
  const reference = `BLOCK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const res = await getDb()
    .prepare(
      `INSERT INTO bookings (reference, room_id, check_in, check_out, status, guest_name)
       SELECT ?1, ?2, ?3, ?4, 'blocked', ?5
       WHERE NOT EXISTS (
         SELECT 1 FROM bookings
         WHERE room_id = ?2 AND status IN ${HOLDS} AND check_in < ?4 AND check_out > ?3
       )`,
    )
    .bind(reference, roomId, checkIn, checkOut, note)
    .run();
  return res.meta.changes === 1;
}

export async function deleteBlock(id: number) {
  await getDb().prepare("DELETE FROM bookings WHERE id = ?1 AND status = 'blocked'").bind(id).run();
}

export async function getBooking(id: number): Promise<AdminBooking | null> {
  const { results } = await getDb().prepare(`${BOOKING_SELECT} WHERE b.id = ?1`).bind(id).all<AdminBooking>();
  return results[0] ?? null;
}
