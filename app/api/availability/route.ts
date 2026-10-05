// app/api/availability/route.ts
// GET /api/availability                          -> the rooms and their packages
// GET /api/availability?room=standard            -> nights already taken for that room
// GET /api/availability?checkIn=...&checkOut=... -> the rooms, each marked available or not
import { NextResponse } from 'next/server';
import { addDays, blockedNights, freeRoomIds, listPackages, listRooms, todayUtc } from '../../lib/db';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOM_ID = /^[a-z0-9_-]{1,40}$/;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const room = params.get('room') ?? '';
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';

  try {
    if (room) {
      if (!ROOM_ID.test(room)) return NextResponse.json({ blocked: [] }, { headers: NO_STORE });
      const from = addDays(todayUtc(), -1);
      const blocked = await blockedNights(room, from, addDays(from, 550));
      return NextResponse.json({ blocked }, { headers: NO_STORE });
    }

    const [rooms, packages] = await Promise.all([listRooms(), listPackages()]);
    const dated = ISO_DATE.test(checkIn) && ISO_DATE.test(checkOut) && checkIn < checkOut;
    const free = dated ? await freeRoomIds(checkIn, checkOut) : null;

    return NextResponse.json(
      { rooms: rooms.map((r) => ({ ...r, available: free ? free.has(r.id) : true })), packages },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error('Availability error:', err);
    return NextResponse.json({ error: 'Availability is unavailable right now.' }, { status: 503, headers: NO_STORE });
  }
}