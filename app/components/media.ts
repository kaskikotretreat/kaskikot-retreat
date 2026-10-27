// app/lib/media.ts
// Room photos uploaded from the admin page are kept in Cloudflare R2 (binding name: PHOTOS).
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Minimal R2 typings, so no extra type package is needed.
type R2Object = { body: ReadableStream; httpEtag: string; httpMetadata?: { contentType?: string } };
type R2Bucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
};

export const MAX_PHOTOS_PER_ROOM = 12;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // the admin page shrinks photos first, so real files are far smaller
export const MEDIA_PREFIX = '/media/';

export class StorageNotSetUp extends Error {}

export function getBucket(): R2Bucket {
  const bucket = (getCloudflareContext().env as unknown as { PHOTOS?: R2Bucket }).PHOTOS;
  if (!bucket) throw new StorageNotSetUp('R2 binding "PHOTOS" is not configured in wrangler.jsonc');
  return bucket;
}

/** Works out the real image type from the first bytes of the file (never trusts the file name). */
export function sniffImage(bytes: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
}

export function newPhotoKey(roomId: string, ext: string): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
  return `rooms/${roomId}/${Date.now().toString(36)}-${random}.${ext}`;
}

/** Deletes uploaded files (paths like /media/rooms/standard/abc.jpg). Photos from the project folder are left alone. */
export async function deleteMedia(paths: string[]): Promise<void> {
  const keys = paths.filter((p) => p.startsWith(MEDIA_PREFIX)).map((p) => p.slice(MEDIA_PREFIX.length));
  if (keys.length === 0) return;
  try {
    await getBucket().delete(keys);
  } catch (e) {
    console.error('Could not delete photos from storage:', e); // the room list is already updated, so this is only tidying
  }
}
