// lib/db.ts
// Availability and bookings stored in Cloudflare D1 (binding name: DB).
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Pkg } from './pricing';
import { parseList } from './room-content';

// Minimal D1 typings, so no extra type package is needed.
type D1Result<T = unknown> = { results: T[]; meta: { changes: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
};
type D1Database = { prepare(query: string): D1Statement };

export type Room = {
  id: string;
  name: string;
  description: string | null;
  nightlyRate: number;
  maxGuests: number; // most people the room can take
  includedGuests: number; // guests covered by the nightly price
  extraGuestRate: number; // added per night for each guest beyond includedGuests
  units: number; // how many identical rooms of this type you have (1 = a single room)
  photos: string[]; // image paths, first one is the cover
  amenities: string[]; // catalog ids (see room-content.ts) or the owner's own wording
};

export type NewBooking = {
  reference: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  guests: number;
  arrivalTime: string;
  specialRequests: string;
  packageId: string; // '' when no package
  totalPrice: number | null;
  priceNote: string;
};

// Bookings with these statuses hold their dates. Set a booking to 'declined' or 'cancelled' to free them.
const HOLDS = "('pending','confirmed','blocked')";

export function getDb(): D1Database {
  const db = (getCloudflareContext().env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error('D1 binding "DB" is not configured in wrangler.jsonc');
  return db;
}

export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function listRooms(): Promise<Room[]> {
  const { results } = await getDb()
    .prepare(`SELECT id, name, description, nightly_rate AS nightlyRate, max_guests AS maxGuests,
              included_guests AS includedGuests, extra_guest_rate AS extraGuestRate, units,
              photos, amenities
       FROM rooms WHERE active = 1 ORDER BY sort, name`)
    .all<Omit<Room, 'photos' | 'amenities'> & { photos: string | null; amenities: string | null }>();
  return results.map((r) => ({ ...r, photos: parseList(r.photos), amenities: parseList(r.amenities) }));
}

export async function listPackages(): Promise<Pkg[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT id, room_id AS roomId, name, nights, price, description FROM packages
       WHERE active = 1 ORDER BY room_id, sort, nights`,
    )
    .all<Pkg>();
  return results;
}

/** How many identical rooms of this type exist (at least 1). */
async function roomUnits(roomId: string): Promise<number> {
  const { results } = await getDb().prepare('SELECT units FROM rooms WHERE id = ?1').bind(roomId).all<{ units: number }>();
  return Math.max(1, results[0]?.units ?? 1);
}

/** Counts, night by night, how many bookings hold each night. */
function nightCounts(bookings: { check_in: string; check_out: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    let guard = 0;
    for (let d = b.check_in; d < b.check_out && guard++ < 400; d = addDays(d, 1)) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

/** Nights with no room of this type left, inside a window, as YYYY-MM-DD strings. With 2 identical rooms, a night shows here only when both are taken. */
export async function blockedNights(roomId: string, from: string, to: string): Promise<string[]> {
  const [units, { results }] = await Promise.all([
    roomUnits(roomId),
    getDb()
      .prepare(
        `SELECT check_in, check_out FROM bookings
         WHERE room_id = ?1 AND status IN ${HOLDS} AND check_out > ?2 AND check_in <= ?3`,
      )
      .bind(roomId, from, to)
      .all<{ check_in: string; check_out: string }>(),
  ]);
  return [...nightCounts(results)].filter(([, n]) => n >= units).map(([d]) => d).sort();
}

/** Ids of the room types that still have at least one room free for every night of these dates. */
export async function freeRoomIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const db = getDb();
  const [rooms, bookings] = await Promise.all([
    db.prepare('SELECT id, units FROM rooms WHERE active = 1').all<{ id: string; units: number }>(),
    db
      .prepare(`SELECT room_id, check_in, check_out FROM bookings WHERE status IN ${HOLDS} AND check_in < ?1 AND check_out > ?2`)
      .bind(checkOut, checkIn)
      .all<{ room_id: string; check_in: string; check_out: string }>(),
  ]);
  const free = new Set<string>();
  for (const r of rooms.results) {
    const counts = nightCounts(bookings.results.filter((b) => b.room_id === r.id));
    let full = false;
    for (let d = checkIn, guard = 0; d < checkOut && guard++ < 400; d = addDays(d, 1)) {
      if ((counts.get(d) ?? 0) >= Math.max(1, r.units)) { full = true; break; }
    }
    if (!full) free.add(r.id);
  }
  return free;
}

/**
 * SQL condition used when saving a stay or a block: true only while at least one room of the type is free
 * on every night. Parameters: ?2 = room id, ?3 = check-in, ?4 = check-out. It runs inside the same
 * INSERT as the save, so two guests booking at the same moment cannot take the last room twice.
 * Busiest point of a range is either its first night or a night where another stay begins, so those are checked.
 */
export const ROOM_FREE_SQL = `
  (SELECT COUNT(*) FROM bookings x
     WHERE x.room_id = ?2 AND x.status IN ${HOLDS} AND x.check_in <= ?3 AND x.check_out > ?3)
    < (SELECT units FROM rooms WHERE id = ?2)
  AND NOT EXISTS (
    SELECT 1 FROM bookings p
    WHERE p.room_id = ?2 AND p.status IN ${HOLDS} AND p.check_in > ?3 AND p.check_in < ?4
      AND (SELECT COUNT(*) FROM bookings x
             WHERE x.room_id = ?2 AND x.status IN ${HOLDS} AND x.check_in <= p.check_in AND x.check_out > p.check_in)
          >= (SELECT units FROM rooms WHERE id = ?2)
  )`;

/**
 * Saves a pending booking only if a room of that type is still free. The check and the insert happen in
 * one SQL statement. Returns false when the dates were taken.
 */
export async function createBooking(b: NewBooking): Promise<boolean> {
  const res = await getDb()
    .prepare(
      `INSERT INTO bookings (reference, room_id, check_in, check_out, status, guest_name, guest_email,
                             guest_phone, nationality, guests, arrival_time, special_requests,
                             package_id, total_price, price_note)
       SELECT ?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
       WHERE ${ROOM_FREE_SQL}`,
    )
    .bind(b.reference, b.roomId, b.checkIn, b.checkOut, b.name, b.email, b.phone, b.nationality, b.guests, b.arrivalTime, b.specialRequests, b.packageId || null, b.totalPrice, b.priceNote || null)
    .run();
  return res.meta.changes === 1;
}
