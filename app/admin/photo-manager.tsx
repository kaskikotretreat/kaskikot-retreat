// app/admin/photo-manager.tsx
// Upload, order and remove the photos of one room. Every change is saved straight away.
import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Act, Say } from './ui';

const MAX_PHOTOS = 12;
const MAX_EDGE = 2000; // pixels, longest side. Plenty for the website, and keeps files small and fast.

/** Shrinks a photo in the browser (also fixes phone rotation), so uploads are quick and pages load fast. */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('encode');
  return blob;
}

type Upload = { id: number; name: string; state: 'working' | 'done' | 'error'; note: string };

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const tileBtn =
  'grid size-9 place-items-center rounded-full bg-white/95 text-slate-800 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600';

export default function PhotoManager({ roomId, photos, act, say, refresh, busy }: {
  roomId: string; photos: string[]; act: Act; say: Say; refresh: () => void; busy: boolean;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState<{ from: string; list: string[] } | null>(null); // shows a change before the page reloads
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [uploadsOn, setUploadsOn] = useState<boolean | null>(null); // null = still checking
  const [names, setNames] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/admin/photos')
      .then((r) => (r.ok ? r.json() : { uploads: false }))
      .then((d) => { if (live) setUploadsOn(!!d.uploads); })
      .catch(() => { if (live) setUploadsOn(false); });
    return () => { live = false; };
  }, []);
  const key = photos.join('|');
  const list = pending && pending.from === key ? pending.list : photos;
  const full = list.length >= MAX_PHOTOS;

  const save = async (next: string[], message: string) => {
    setPending({ from: key, list: next });
    const ok = await act({ action: 'setPhotos', roomId, photos: next }, message);
    if (!ok) setPending(null);
  };
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void save(next, to === 0 ? 'New cover photo set.' : 'Photo moved.');
  };
  const remove = (index: number) => {
    if (window.confirm('Remove this photo? It will no longer show on the website.')) {
      void save(list.filter((_, i) => i !== index), 'Photo removed.');
    }
  };

  const upload = async (files: File[]) => {
    const room = MAX_PHOTOS - list.length;
    const chosen = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (chosen.length === 0) return say('err', 'Please choose photos (JPG, PNG or WebP).');
    const batch = chosen.slice(0, Math.max(0, room));
    if (batch.length === 0) return say('err', `A room can have up to ${MAX_PHOTOS} photos. Remove one first.`);
    if (batch.length < chosen.length) say('err', `Only ${batch.length} of ${chosen.length} photos fit. A room can have up to ${MAX_PHOTOS}.`);

    setWorking(true);
    const rows: Upload[] = batch.map((f, i) => ({ id: Date.now() + i, name: f.name, state: 'working', note: 'Waiting' }));
    setUploads(rows);
    const update = (id: number, patch: Partial<Upload>) => setUploads((cur) => cur.map((u) => (u.id === id ? { ...u, ...patch } : u)));

    let done = 0;
    for (let i = 0; i < batch.length; i++) {
      const row = rows[i];
      try {
        update(row.id, { note: 'Preparing' });
        const blob = await prepare(batch[i]).catch(() => {
          throw new Error('This photo could not be read. Please use a JPG, PNG or WebP photo.');
        });
        update(row.id, { note: 'Uploading' });
        const form = new FormData();
        form.append('roomId', roomId);
        form.append('file', blob, 'photo.jpg');
        const res = await fetch('/api/admin/photos', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('You were logged out. Please log in again.');
        if (!res.ok) throw new Error(data.error || 'Upload failed.');
        done++;
        update(row.id, { state: 'done', note: 'Added' });
      } catch (e) {
        update(row.id, { state: 'error', note: e instanceof Error ? e.message : 'Upload failed.' });
        if (e instanceof Error && /storage is not set up/i.test(e.message)) break; // no point trying the rest
      }
    }
    setWorking(false);
    if (done > 0) {
      say('ok', done === 1 ? 'Photo added.' : `${done} photos added.`);
      refresh();
    }
    if (input.current) input.current.value = '';
    setTimeout(() => setUploads((cur) => cur.filter((u) => u.state === 'error')), 3500);
  };

  const addNames = async () => {
    const list = names.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) return;
    if (await act({ action: 'addPhotoNames', roomId, names: list }, 'Photos added.')) setNames('');
  };

  const onDropFiles = (e: DragEvent) => {
    e.preventDefault();
    setFileDrag(false);
    if (!working && !full) void upload(Array.from(e.dataTransfer.files));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Photos <span className="font-medium text-slate-500">({list.length} of {MAX_PHOTOS})</span></h4>
          <p className="text-xs text-slate-500">The first photo is the cover. Drag photos to reorder, or use the arrows. A faded photo means its file is not in the folder yet. Changes save straight away.</p>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((src, i) => (
            <li
              key={src}
              draggable={!busy}
              onDragStart={() => setDragging(i)}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onDragOver={(e) => { if (dragging !== null) { e.preventDefault(); setOver(i); } }}
              onDrop={(e) => { if (dragging !== null) { e.preventDefault(); const from = dragging; setDragging(null); setOver(null); move(from, i); } }}
              className={`group relative overflow-hidden rounded-xl border bg-slate-100 transition ${
                over === i && dragging !== i ? 'border-emerald-500 ring-2 ring-emerald-300' : i === 0 ? 'border-emerald-500' : 'border-slate-200'
              } ${dragging === i ? 'opacity-40' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? 'Cover photo' : `Photo ${i + 1}`} draggable={false} loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = '.2'; e.currentTarget.title = 'This photo file was not found'; }}
                className="aspect-[4/3] w-full cursor-grab object-cover active:cursor-grabbing" />
              <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow ${i === 0 ? 'bg-emerald-600 text-white' : 'bg-white/95 text-slate-700'}`}>
                {i === 0 ? 'Cover' : i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-2 pt-6">
                <span className="flex gap-1">
                  <button type="button" className={tileBtn} disabled={busy || i === 0} onClick={() => move(i, i - 1)} aria-label="Move earlier">
                    <svg viewBox="0 0 24 24" width="16" height="16" {...ICON} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                  </button>
                  <button type="button" className={tileBtn} disabled={busy || i === list.length - 1} onClick={() => move(i, i + 1)} aria-label="Move later">
                    <svg viewBox="0 0 24 24" width="16" height="16" {...ICON} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  {i > 0 && (
                    <button type="button" className={tileBtn} disabled={busy} onClick={() => move(i, 0)} aria-label="Make this the cover photo" title="Make cover">
                      <svg viewBox="0 0 24 24" width="16" height="16" {...ICON} aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                    </button>
                  )}
                </span>
                <button type="button" className={`${tileBtn} !text-red-700`} disabled={busy} onClick={() => remove(i)} aria-label="Remove this photo">
                  <svg viewBox="0 0 24 24" width="16" height="16" {...ICON} aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <h5 className="text-sm font-bold text-slate-900">Add photos from your project folder</h5>
        <p className="mt-1 text-xs text-slate-500">
          Put the photo files in <code className="rounded bg-slate-100 px-1 py-0.5">public/images/rooms/</code> in your project, deploy, then type their file names here (one per line, or separated by commas).
          Use JPG, PNG or WebP, with names made of letters, numbers and dashes, like <code className="rounded bg-slate-100 px-1 py-0.5">standard-1.jpg</code>.
        </p>
        <textarea className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-emerald-600" rows={3}
          value={names} disabled={busy || full} onChange={(e) => setNames(e.target.value)}
          placeholder={'standard-1.jpg\nstandard-2.jpg'} />
        <button type="button" disabled={busy || full || !names.trim()} onClick={() => void addNames()}
          className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">
          Add these photos
        </button>
      </div>

      {uploadsOn === false ? (
      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Uploading from here is switched off for now.</span> It needs a Cloudflare R2 bucket. The code is ready, so it will switch on as soon as you add the bucket.
      </div>
      ) : uploadsOn === true ? (
      <label
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setFileDrag(true); } }}
        onDragLeave={() => setFileDrag(false)}
        onDrop={onDropFiles}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          full ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : fileDrag ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50/50'
        }`}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" {...ICON} className="text-emerald-700" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
        <span className="text-sm font-semibold text-slate-800">{working ? 'Uploading…' : full ? 'This room has the most photos allowed' : 'Add photos'}</span>
        <span className="text-xs text-slate-500">{full ? 'Remove a photo to add another' : 'Tap to choose from your phone or computer, or drop photos here. You can pick several at once.'}</span>
        <input ref={input} type="file" accept="image/*" multiple disabled={working || full} className="sr-only"
          onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
      </label>
      ) : null}

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${u.state === 'error' ? 'bg-red-50 text-red-800' : u.state === 'done' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}>
              <span className="min-w-0 truncate font-medium">{u.name}</span>
              <span className="shrink-0 text-xs font-semibold">{u.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
