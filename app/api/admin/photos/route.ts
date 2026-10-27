// app/api/admin/photos/route.ts
// Logged-in owner: upload one room photo (the admin page sends them one at a time, already shrunk).
import { NextResponse } from 'next/server';
import { guard } from '../../../lib/admin-auth';
import { appendRoomPhoto, getRoomPhotos, roomExists } from '../../../lib/admin-db';
import { getBucket, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ROOM, MEDIA_PREFIX, newPhotoKey, sniffImage, StorageNotSetUp } from '../../../lib/media';

const ROOM_ID = /^[a-z0-9_-]{1,60}$/;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Tells the admin page whether uploading is switched on (the PHOTOS storage binding exists). */
export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    getBucket();
    return NextResponse.json({ uploads: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ uploads: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;

  try {
    const form = await req.formData().catch(() => null);
    const roomId = String(form?.get('roomId') ?? '');
    const file = form?.get('file');
    if (!form || !ROOM_ID.test(roomId) || !(file instanceof File)) return bad('Please choose a room and a photo.');
    if (file.size === 0) return bad('That photo is empty.');
    if (file.size > MAX_PHOTO_BYTES) return bad('That photo is too large. Please choose one under 5 MB.');
    if (!(await roomExists(roomId))) return bad('That room was not found.');

    const existing = await getRoomPhotos(roomId);
    if (existing.length >= MAX_PHOTOS_PER_ROOM) return bad(`A room can have up to ${MAX_PHOTOS_PER_ROOM} photos. Remove one first.`);

    const bytes = await file.arrayBuffer();
    const kind = sniffImage(new Uint8Array(bytes.slice(0, 16)));
    if (!kind) return bad('Please upload a JPG, PNG or WebP photo.');

    const bucket = getBucket();
    const key = newPhotoKey(roomId, kind.ext);
    await bucket.put(key, bytes, { httpMetadata: { contentType: kind.type } });

    try {
      const photos = await appendRoomPhoto(roomId, `${MEDIA_PREFIX}${key}`);
      return NextResponse.json({ ok: true, path: `${MEDIA_PREFIX}${key}`, photos });
    } catch (e) {
      await bucket.delete(key).catch(() => {}); // do not leave a file nobody can see
      throw e;
    }
  } catch (e) {
    if (e instanceof StorageNotSetUp) {
      console.error(e.message);
      return bad('Photo storage is not set up yet. Create the R2 bucket and add the PHOTOS binding (see the setup steps).', 503);
    }
    console.error('Photo upload error:', e);
    return bad('Could not upload that photo. Please try again.', 500);
  }
}
