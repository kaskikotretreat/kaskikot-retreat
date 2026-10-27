'use client';
// app/components/views.tsx
// "Views": a masonry gallery of the photos listed in app/lib/views.ts, with tag filters and a full-screen viewer
// (arrows, swipe, keyboard). Photos load quietly, keep their own proportions, and fade in as you scroll.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Dancing_Script, Instrument_Serif, Montserrat } from 'next/font/google';
import { VIEWS, viewSrc } from '../lib/views';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const script = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const sans = Montserrat({ subsets: ['latin'], display: 'swap' });

const CSS = `
.vw-tile { opacity: 0; transform: translateY(28px) scale(.98); transition: opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1); }
.vw-tile.vw-in { opacity: 1; transform: none; }
@keyframes vw-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.vw-skel { background: linear-gradient(90deg, #ece6d8 25%, #f6f2e9 50%, #ece6d8 75%); background-size: 200% 100%; animation: vw-shimmer 1.6s linear infinite; }
@keyframes vw-fade { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }
.vw-photo { animation: vw-fade .5s cubic-bezier(.22,1,.36,1); }
@keyframes vw-backdrop { from { opacity: 0; } to { opacity: 1; } }
.vw-backdrop { animation: vw-backdrop .3s ease; }
@media (prefers-reduced-motion: reduce) {
  .vw-tile { opacity: 1; transform: none; transition: none; }
  .vw-skel, .vw-photo, .vw-backdrop { animation: none; }
}
`;

type Item = { src: string; caption: string; tag: string; w: number; h: number };

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8431f]';

/** Fades a tile in once, as it scrolls into view. */
function Tile({ item, index, onOpen }: { item: Item; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={item.caption ? `Open photo: ${item.caption}` : 'Open photo'}
      style={{ aspectRatio: `${item.w} / ${item.h}`, transitionDelay: `${(index % 3) * 90}ms` } as CSSProperties}
      className={`vw-tile ${shown ? 'vw-in' : ''} group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-[#e9e3d6] text-left shadow-[0_10px_30px_-18px_rgba(31,47,38,.55)] md:mb-4 md:rounded-3xl lg:mb-5 ${ring}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.caption || 'View from Kaskikot Retreat'}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07] motion-reduce:transition-none"
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101a14]/75 via-[#101a14]/10 to-transparent opacity-80 transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100" />
      {(item.caption || item.tag) && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-0 flex-col gap-1 p-3 text-white transition duration-500 md:translate-y-3 md:p-5 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
          {item.tag && <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f1d3a4]">{item.tag}</span>}
          {item.caption && <span className={`${serif.className} text-lg leading-tight md:text-2xl`}>{item.caption}</span>}
        </span>
      )}
      <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/85 text-[#1f2f26] opacity-0 shadow transition duration-300 group-hover:opacity-100 max-md:hidden" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" {...ICON}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
      </span>
    </button>
  );
}

/** Full-screen viewer. Arrows, swipe, Esc, and the photo before and after are loaded ahead of time. */
function Lightbox({ items, index, onClose, onGo }: { items: Item[]; index: number; onClose: () => void; onGo: (i: number) => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const item = items[index];
  const go = useCallback((d: number) => onGo((index + d + items.length) % items.length), [index, items.length, onGo]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        e.preventDefault(); // keep focus inside the viewer: only the buttons matter here
        closeBtn.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, onClose]);

  useEffect(() => {
    for (const d of [1, -1]) {
      const n = items[(index + d + items.length) % items.length];
      if (n) new Image().src = n.src;
    }
  }, [index, items]);

  const navBtn = `grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 ${'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="vw-backdrop fixed inset-0 z-[200] flex flex-col bg-[#0b120e]/95 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white md:px-8 md:py-5" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-semibold tabular-nums tracking-widest text-white/70">
          {String(index + 1).padStart(2, '0')} <span className="text-white/35">/ {String(items.length).padStart(2, '0')}</span>
        </span>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className={navBtn}>
          <svg viewBox="0 0 24 24" width="22" height="22" {...ICON}><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 md:px-20"
        onPointerDown={(e) => { startX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }}
      >
        {items.length > 1 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" className={`${navBtn} absolute left-3 z-10 max-md:hidden md:left-6`}>
            <svg viewBox="0 0 24 24" width="22" height="22" {...ICON}><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.src}
          src={item.src}
          alt={item.caption || 'View from Kaskikot Retreat'}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="vw-photo max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
        />
        {items.length > 1 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" className={`${navBtn} absolute right-3 z-10 max-md:hidden md:right-6`}>
            <svg viewBox="0 0 24 24" width="22" height="22" {...ICON}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      <div className="px-4 pb-5 pt-4 text-center text-white md:pb-8" onClick={(e) => e.stopPropagation()}>
        {item.tag && <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#f1d3a4]">{item.tag}</p>}
        {item.caption && <p className={`${serif.className} mt-1 text-2xl md:text-3xl`}>{item.caption}</p>}
        {items.length > 1 && <p className="mt-2 text-xs text-white/40 md:hidden">Swipe to see more</p>}
      </div>
    </div>
  );
}

export default function Views() {
  const [loaded, setLoaded] = useState<Record<string, { w: number; h: number }>>({});
  const [settled, setSettled] = useState(0);
  const [tag, setTag] = useState('All');
  const [open, setOpen] = useState<number | null>(null);

  // Check each listed photo once. Missing ones are skipped; the rest keep their real proportions.
  useEffect(() => {
    let live = true;
    for (const v of VIEWS) {
      const img = new Image();
      const src = viewSrc(v.file);
      img.onload = () => {
        if (!live) return;
        setLoaded((cur) => ({ ...cur, [src]: { w: img.naturalWidth || 4, h: img.naturalHeight || 3 } }));
        setSettled((n) => n + 1);
      };
      img.onerror = () => { if (live) setSettled((n) => n + 1); };
      img.src = src;
    }
    return () => { live = false; };
  }, []);

  const all: Item[] = useMemo(() => {
    const seen = new Set<string>(); // a file listed twice is shown once (the first line wins)
    return VIEWS.flatMap((v) => {
      const src = viewSrc(v.file);
      const size = loaded[src];
      if (!size || seen.has(src)) return [];
      seen.add(src);
      return [{ src, caption: v.caption ?? '', tag: v.tag ?? '', w: size.w, h: size.h }];
    });
  }, [loaded]);
  const tags = useMemo(() => [...new Set(all.map((i) => i.tag).filter(Boolean))], [all]);
  const activeTag = tag === 'All' || tags.includes(tag) ? tag : 'All';
  const shown = activeTag === 'All' ? all : all.filter((i) => i.tag === activeTag);
  const checking = settled < VIEWS.length;
  const close = useCallback(() => setOpen(null), []);

  return (
    <section id="views" className={`${sans.className} scroll-mt-20 bg-[#fbf9f4] px-5 py-20 text-[#1f2f26] md:px-12 md:py-28 lg:px-16`}>
      <style>{CSS}</style>
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className={`${script.className} text-3xl font-semibold text-[#a8431f] md:text-4xl`}>Through our windows</p>
          <h2 className={`${serif.className} mt-1 text-5xl leading-none md:text-7xl`}>The views</h2>
          <p className="mt-4 text-[#4a5a50] md:text-lg">Mountains at sunrise, the lake in the distance, and quiet green all around. This is what you wake up to.</p>
        </header>

        {tags.length > 1 && (
          <div className="mt-9 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter photos">
            {['All', ...tags].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                aria-pressed={activeTag === t}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${ring} ${
                  activeTag === t ? 'border-[#1f2f26] bg-[#1f2f26] text-white' : 'border-[#d8d1c1] bg-white text-[#3c4d43] hover:border-[#1f2f26]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 md:mt-12">
          {shown.length > 0 ? (
            <div key={activeTag} className="columns-2 gap-3 md:columns-3 md:gap-4 lg:gap-5">
              {shown.map((item, i) => (
                <Tile key={item.src} item={item} index={i} onOpen={() => setOpen(i)} />
              ))}
            </div>
          ) : checking ? (
            <div className="columns-2 gap-3 md:columns-3 md:gap-4" aria-hidden="true">
              {[1.3, 0.8, 1, 0.75, 1.2, 0.9].map((r, i) => (
                <div key={i} className="vw-skel mb-3 break-inside-avoid rounded-2xl md:mb-4 md:rounded-3xl" style={{ aspectRatio: `1 / ${r}` }} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[#d8d1c1] bg-white/60 px-6 py-14 text-center">
              <p className={`${serif.className} text-3xl`}>Photos coming soon</p>
              <p className="mt-2 text-sm text-[#4a5a50]">We are putting together our favourite views for you.</p>
            </div>
          )}
        </div>

        {shown.length > 0 && <p className="mt-8 text-center text-sm text-[#8a857a]">Tap any photo to see it full size.</p>}
      </div>

      {open !== null && shown[open] && <Lightbox items={shown} index={open} onClose={close} onGo={setOpen} />}
    </section>
  );
}