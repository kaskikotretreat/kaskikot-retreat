// app/lib/room-content.ts
// Shared by the website, the admin page and the database code: the amenity list (with icons),
// and the small rules for cleaning photo names and amenity labels. Pure functions, safe in the browser.

export type Amenity = { id: string; label: string; icon: string }; // icon = SVG path(s) for a 24x24 outline icon

/** Amenities the owner can tick for each room. Anything else typed in the admin page is shown with a tick icon. */
export const AMENITIES: Amenity[] = [
  { id: 'wifi', label: 'Free Wi-Fi', icon: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.2h.01' },
  { id: 'hot-water', label: 'Hot water', icon: 'M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z' },
  { id: 'attached-bath', label: 'Attached bathroom', icon: 'M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 4 0M7 21l-1 1M17 21l1 1' },
  { id: 'double-bed', label: 'Double bed', icon: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11h.01' },
  { id: 'twin-beds', label: 'Twin beds', icon: 'M2 18V8M2 14h9v4M13 14h9v4M22 18V8M5 11h3M16 11h3' },
  { id: 'extra-bed', label: 'Extra bed on request', icon: 'M3 18V8M3 14h12v4M15 14v-1a3 3 0 0 0-3-3H8M19 7v6M16 10h6' },
  { id: 'mountain-view', label: 'Mountain view', icon: 'M2 20 9 7l4.5 8 2.5-4 6 9H2z' },
  { id: 'lake-view', label: 'Lake view', icon: 'M3 9c2-2 4 2 6 0s4 2 6 0 4 2 6 0M3 15c2-2 4 2 6 0s4 2 6 0 4 2 6 0M3 21c2-2 4 2 6 0s4 2 6 0 4 2 6 0' },
  { id: 'garden-view', label: 'Garden view', icon: 'M20 4C9 4 4 9 4 15c0 2 1 4 3 5 7 0 13-5 13-16zM4 20c3-5 7-8 12-10' },
  { id: 'balcony', label: 'Private balcony', icon: 'M4 11h16M4 20h16M6 11v9M10 11v9M14 11v9M18 11v9M8 11V7a4 4 0 0 1 8 0v4' },
  { id: 'terrace', label: 'Terrace seating', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  { id: 'tv', label: 'TV', icon: 'M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 21h8' },
  { id: 'heater', label: 'Room heater', icon: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z' },
  { id: 'fan', label: 'Fan', icon: 'M12 12c0-5 2-8 5-7s2 5-5 7zM12 12c5 0 8 2 7 5s-5 2-7-5zM12 12c0 5-2 8-5 7s-2-5 5-7zM12 12c-5 0-8-2-7-5s5-2 7 5z' },
  { id: 'power-backup', label: 'Power backup', icon: 'M13 2 4 14h7l-1 8 9-12h-7z' },
  { id: 'toiletries', label: 'Towels and toiletries', icon: 'M9 3h6v3H9zM8 6h8v15H8zM8 12h8' },
  { id: 'workspace', label: 'Work desk', icon: 'M5 6h14v9H5zM2 19h20' },
  { id: 'kitchen', label: 'Kitchen access', icon: 'M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM3 10h18M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2' },
  { id: 'meals', label: 'Home-cooked meals on request', icon: 'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zM3.5 3v6a2 2 0 0 0 4 0V3M5.5 3v18M20.5 21V3c-2.2 1.4-3 4-3 7h3' },
  { id: 'parking', label: 'Free parking', icon: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM10 16V8h3a2.5 2.5 0 0 1 0 5h-3' },
  { id: 'laundry', label: 'Laundry', icon: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 6h.01M11 6h.01' },
  { id: 'bonfire', label: 'Bonfire evenings', icon: 'M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 2 1 2 0-3-1-4 1-6zM4 21l16-4M20 21 4 17' },
  { id: 'family', label: 'Family friendly', icon: 'M12 20s-7.5-4.6-9-9.5C2 7 4.3 4.5 7.2 4.5c1.9 0 3.5 1 4.8 3 1.3-2 2.9-3 4.8-3C19.7 4.5 22 7 21 10.5 19.5 15.4 12 20 12 20z' },
];

export const CUSTOM_ICON = 'M5 12.5l4.5 4.5L19 7.5'; // a tick, for amenities typed in by the owner
const BY_ID = new Map(AMENITIES.map((a) => [a.id, a]));

/** An amenity as the website shows it: the catalog entry, or the owner's own text with a tick. */
export function describeAmenity(value: string): Amenity {
  return BY_ID.get(value) ?? { id: value, label: value, icon: CUSTOM_ICON };
}

/** Keeps a catalog id as it is, and tidies anything typed in. Returns '' when nothing usable is left. */
export function cleanAmenity(value: unknown): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (BY_ID.has(text)) return text;
  const byLabel = AMENITIES.find((a) => a.label.toLowerCase() === text.toLowerCase());
  if (byLabel) return byLabel.id;
  return text.replace(/[<>"`]/g, '');
}

export function cleanAmenities(values: unknown): string[] {
  const list = Array.isArray(values) ? values : [];
  const out: string[] = [];
  for (const v of list) {
    const clean = cleanAmenity(v);
    if (clean && !out.includes(clean)) out.push(clean);
    if (out.length >= 30) break;
  }
  return out;
}

export const PHOTO_FOLDER = '/images/rooms/';
const PHOTO_NAME = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,100}\.(jpe?g|png|webp|avif)$/i;

/**
 * "standard-1.jpg" becomes "/images/rooms/standard-1.jpg". Names that already start with "/" are kept.
 * Returns null for anything that is not a plain image file name (no "..", no web addresses).
 */
export function normalizePhoto(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const path = raw.startsWith('/') ? raw.slice(1) : raw.replace(/^public\//, '').replace(/^images\/rooms\//, '');
  if (raw.startsWith('/')) {
    if (!PHOTO_NAME.test(path) || path.includes('..') || path.includes('//')) return null;
    return `/${path}`;
  }
  if (!PHOTO_NAME.test(path) || path.includes('..') || path.includes('//')) return null;
  return `${PHOTO_FOLDER}${path}`;
}

export function cleanPhotos(values: unknown): string[] {
  const list = Array.isArray(values) ? values : [];
  const out: string[] = [];
  for (const v of list) {
    const photo = normalizePhoto(v);
    if (photo && !out.includes(photo)) out.push(photo);
    if (out.length >= 12) break;
  }
  return out;
}

/** What the admin page shows for a stored photo path: just the file name when it is in the usual folder. */
export const photoLabel = (path: string) => (path.startsWith(PHOTO_FOLDER) ? path.slice(PHOTO_FOLDER.length) : path);

/** Reads a JSON list stored in the database. Anything unreadable becomes an empty list. */
export function parseList(stored: string | null | undefined): string[] {
  if (!stored) return [];
  try {
    const v = JSON.parse(stored);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
