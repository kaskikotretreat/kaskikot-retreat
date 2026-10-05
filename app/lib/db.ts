// lib/db.ts
// Availability and bookings stored in Cloudflare D1 (binding name: DB).
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Pkg } from './pricing';

// Minimal D1 typings, so no extra type package is needed.
type D1Result<T = unknown> = { results: T[]; meta: { changes: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
};
type D1Database = { prepare(query: string): D1Statement };

export type Room = { id: string; name: string; description: string | null; nightlyRate: number };

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
    .prepare('SELECT id, name, description, nightly_rate AS nightlyRate FROM rooms WHERE active = 1 ORDER BY sort, name')
    .all<Room>();
  return results;
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

/** Every night already taken for one room inside a window, as YYYY-MM-DD strings. */
export async function blockedNights(roomId: string, from: string, to: string): Promise<string[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT check_in, check_out FROM bookings
       WHERE room_id = ?1 AND status IN ${HOLDS} AND check_out > ?2 AND check_in <= ?3`,
    )
    .bind(roomId, from, to)
    .all<{ check_in: string; check_out: string }>();

  const nights = new Set<string>();
  for (const b of results) {
    let guard = 0;
    for (let d = b.check_in; d < b.check_out && guard++ < 400; d = addDays(d, 1)) nights.add(d);
  }
  return [...nights].sort();
}

/** Ids of the rooms with no booking overlapping these dates. */
export async function freeRoomIds(checkIn: string, checkOut: string): Promise<Set<string>> {
  const { results } = await getDb()
    .prepare(
      `SELECT r.id FROM rooms r
       WHERE r.active = 1 AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.room_id = r.id AND b.status IN ${HOLDS} AND b.check_in < ?1 AND b.check_out > ?2
       )`,
    )
    .bind(checkOut, checkIn)
    .all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

/**
 * Saves a pending booking only if the room is still free. The check and the insert happen in one
 * SQL statement, so two guests booking at the same moment cannot both succeed.
 * Returns false when the dates were taken.
 */
export async function createBooking(b: NewBooking): Promise<boolean> {
  const res = await getDb()
    .prepare(
      `INSERT INTO bookings (reference, room_id, check_in, check_out, status, guest_name, guest_email,
                             guest_phone, nationality, guests, arrival_time, special_requests,
                             package_id, total_price, price_note)
       SELECT ?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
       WHERE NOT EXISTS (
         SELECT 1 FROM bookings
         WHERE room_id = ?2 AND status IN ${HOLDS} AND check_in < ?4 AND check_out > ?3
       )`,
    )
    .bind(b.reference, b.roomId, b.checkIn, b.checkOut, b.name, b.email, b.phone, b.nationality, b.guests, b.arrivalTime, b.specialRequests, b.packageId || null, b.totalPrice, b.priceNote || null)
    .run();
  return res.meta.changes === 1;
}