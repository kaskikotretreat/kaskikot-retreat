// app/media/[...key]/route.ts
// Serves the room photos stored in R2, e.g. /media/rooms/standard/abc123.jpg. Public, like the rest of the site.
import { getBucket } from '../../lib/media';

const KEY = /^rooms\/[a-z0-9_-]{1,60}\/[a-z0-9-]{4,60}\.(jpg|png|webp)$/;

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const path = (key ?? []).join('/');
  if (!KEY.test(path)) return new Response('Not found', { status: 404 });

  try {
    const object = await getBucket().get(path);
    if (!object) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable', // every upload gets a new name, so this is safe
        ETag: object.httpEtag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error('Photo read error:', e);
    return new Response('Photos are unavailable right now.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
