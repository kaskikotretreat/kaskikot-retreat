'use client';
// app/components/stay.tsx
// "The stay": one card per room with a photo gallery, what the room has, its price and a Book button,
// plus a side-by-side comparison. Everything comes from the admin page (Rooms and prices).
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Dancing_Script, Instrument_Serif, Montserrat } from 'next/font/google';
import { formatPrice } from '../lib/pricing';
import { AMENITIES, describeAmenity } from '../lib/room-content';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const script = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const sans = Montserrat({ subsets: ['latin'], display: 'swap' });

type StayRoom = {
  id: string;
  name: string;
  description: string | null;
  nightlyRate: number;
  maxGuests: number;
  includedGuests: number;
  extraGuestRate: number;
  units: number;
  photos: string[];
  amenities: string[];
};

const CSS = `
.st-reveal { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
.st-reveal.st-in { opacity: 1; transform: none; }
.st-scroll { scrollbar-width: none; }
.st-scroll::-webkit-scrollbar { display: none; }
@keyframes st-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.st-skeleton { background: linear-gradient(90deg, #ece6d8 25%, #f5f1e8 50%, #ece6d8 75%); background-size: 200% 100%; animation: st-shimmer 1.6s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .st-reveal { opacity: 1; transform: none; transition: none; }
  .st-skeleton { animation: none; }
}
`;

// ─── Small pieces ────────────────────────────────────────────────────────────

function Svg({ d, size = 20, stroke = 1.7 }: { d: string; size?: number; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const GUESTS_ICON = 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M17 12a2.4 2.4 0 1 0 0-4.8M16.5 14.6c2.6.2 4.1 2 4.5 5';
const MOUNTAIN_ICON = 'M2 20 9 7l4.5 8 2.5-4 6 9H2z';

/** Fades and rises into view once, as the guest scrolls to it. */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
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
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`st-reveal ${shown ? 'st-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

// ─── Photo gallery (swipe on phones, arrows and dots everywhere) ─────────────

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const good = photos.filter((p) => !failed.includes(p));

  if (good.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#dfe9e1] to-[#c7dacb] text-[#2f6b4a]">
        <Svg d={MOUNTAIN_ICON} size={40} stroke={1.4} />
        <span className="text-sm font-semibold">Photos coming soon</span>
      </div>
    );
  }

  const go = (to: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = (to + good.length) % good.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const current = Math.min(index, good.length - 1);

  return (
    <div className="group relative h-full">
      <div ref={scroller} onScroll={onScroll} className="st-scroll flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth" role="group" aria-label={`${name} photos`}>
        {good.map((src, i) => (
          <div key={src} className="relative h-full min-w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={`${name}, photo ${i + 1} of ${good.length}`}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
              unoptimized={src.startsWith('/media/')} // uploaded photos are already resized
              onError={() => setFailed((f) => (f.includes(src) ? f : [...f, src]))}
            />
          </div>
        ))}
      </div>

      {good.length > 1 && (
        <>
          <button type="button" onClick={() => go(current - 1)} aria-label="Previous photo"
            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#1f2f26] shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100">
            <Svg d="M15 6l-6 6 6 6" size={18} stroke={2.2} />
          </button>
          <button type="button" onClick={() => go(current + 1)} aria-label="Next photo"
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#1f2f26] shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100">
            <Svg d="M9 6l6 6-6 6" size={18} stroke={2.2} />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5" aria-hidden="true">
            {good.map((src, i) => (
              <span key={src} className={`h-1.5 rounded-full bg-white shadow transition-all ${i === current ? 'w-5' : 'w-1.5 opacity-70'}`} />
            ))}
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
            {current + 1} / {good.length}
          </span>
        </>
      )}
    </div>
  );
}

// ─── One room ────────────────────────────────────────────────────────────────

function RoomCard({ room, flip }: { room: StayRoom; flip: boolean }) {
  const [all, setAll] = useState(false);
  const LIMIT = 8;
  const list = room.amenities.map(describeAmenity);
  const shown = all ? list : list.slice(0, LIMIT);
  const extraApplies = room.extraGuestRate > 0 && room.maxGuests > room.includedGuests;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#e9e2d2] bg-white shadow-[0_24px_60px_-30px_rgba(31,47,38,.35)] lg:grid lg:grid-cols-[1.15fr_1fr]">
      <div className={`aspect-[4/3] bg-[#e9efe9] lg:aspect-auto lg:min-h-[480px] ${flip ? 'lg:order-2' : ''}`}>
        <Gallery photos={room.photos} name={room.name} />
      </div>

      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3eee4] px-3 py-1 text-xs font-bold text-[#245a3a]">
            <Svg d={GUESTS_ICON} size={15} /> Sleeps up to {room.maxGuests}
          </span>
          {room.units > 1 && (
            <span className="inline-flex items-center rounded-full bg-[#f3e6d3] px-3 py-1 text-xs font-bold text-[#8a5a1f]">{room.units} rooms of this type</span>
          )}
        </div>

        <h3 className={`${serif.className} mt-3 text-4xl leading-tight text-[#1f2f26] sm:text-5xl`}>{room.name}</h3>
        {room.description && <p className="mt-2 text-base leading-relaxed text-[#4a5a50]">{room.description}</p>}

        {list.length > 0 ? (
          <>
            <h4 className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#5b6a60]">What this room has</h4>
            <ul className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {shown.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-[15px] font-medium leading-snug text-[#1f2f26]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eef3ee] text-[#2f6b4a]">
                    <Svg d={a.icon} size={18} />
                  </span>
                  {a.label}
                </li>
              ))}
            </ul>
            {list.length > LIMIT && (
              <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
                className="mt-3 self-start text-sm font-bold text-[#245a3a] underline underline-offset-4 hover:text-[#1b4a2f]">
                {all ? 'Show fewer' : `Show all ${list.length}`}
              </button>
            )}
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-[#f7f3ec] p-4 text-sm text-[#4a5a50]">Details for this room are coming soon. Ask us anything when you book.</p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
          <div>
            {room.nightlyRate > 0 ? (
              <>
                <p className="text-xs font-semibold text-[#5b6a60]">From</p>
                <p className="text-3xl font-bold leading-none text-[#1f2f26]">
                  {formatPrice(room.nightlyRate)} <span className="text-sm font-medium text-[#5b6a60]">/ night</span>
                </p>
                {extraApplies && (
                  <p className="mt-1.5 text-xs text-[#5b6a60]">
                    Covers {room.includedGuests} {room.includedGuests === 1 ? 'guest' : 'guests'}. Extra guests {formatPrice(room.extraGuestRate)} each per night.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-[#4a5a50]">Ask us for the rate</p>
            )}
          </div>
          <Link
            href={`/booking?room=${encodeURIComponent(room.id)}`}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#a8431f] px-7 text-[15px] font-bold text-white transition hover:bg-[#8f3716] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8431f] active:scale-[.98] max-sm:w-full"
          >
            Book this room
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Side-by-side comparison ─────────────────────────────────────────────────

function Compare({ rooms }: { rooms: StayRoom[] }) {
  const catalogOrder = AMENITIES.map((a) => a.id);
  const used = new Set(rooms.flatMap((r) => r.amenities));
  const rows = [...catalogOrder.filter((id) => used.has(id)), ...[...used].filter((id) => !catalogOrder.includes(id))];
  if (rooms.length < 2 || rows.length === 0) return null;

  return (
    <details className="group mt-8 overflow-hidden rounded-[1.5rem] border border-[#e9e2d2] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 text-base font-bold text-[#1f2f26] marker:content-none [&::-webkit-details-marker]:hidden">
        Compare rooms side by side
        <span className="grid size-8 place-items-center rounded-full bg-[#e3eee4] text-[#245a3a] transition-transform group-open:rotate-180">
          <Svg d="m6 9 6 6 6-6" size={18} stroke={2.2} />
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-[#eee8db]">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#faf7f0]">
              <th scope="col" className="sticky left-0 z-10 bg-[#faf7f0] px-5 py-3 font-semibold text-[#5b6a60]">&nbsp;</th>
              {rooms.map((r) => (
                <th key={r.id} scope="col" className="px-4 py-3 text-center font-bold text-[#1f2f26]">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#eee8db]">
              <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-[#1f2f26]">Sleeps up to</th>
              {rooms.map((r) => <td key={r.id} className="px-4 py-3 text-center font-semibold text-[#1f2f26]">{r.maxGuests}</td>)}
            </tr>
            <tr className="border-t border-[#eee8db]">
              <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-[#1f2f26]">From, per night</th>
              {rooms.map((r) => <td key={r.id} className="px-4 py-3 text-center font-semibold text-[#1f2f26]">{r.nightlyRate > 0 ? formatPrice(r.nightlyRate) : 'Ask us'}</td>)}
            </tr>
            {rows.map((id) => {
              const a = describeAmenity(id);
              return (
                <tr key={id} className="border-t border-[#eee8db]">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-[#1f2f26]">
                    <span className="flex items-center gap-2.5"><span className="text-[#2f6b4a]"><Svg d={a.icon} size={17} /></span>{a.label}</span>
                  </th>
                  {rooms.map((r) => {
                    const has = r.amenities.includes(id);
                    return (
                      <td key={r.id} className="px-4 py-3 text-center">
                        {has ? (
                          <span className="inline-grid size-6 place-items-center rounded-full bg-[#e3eee4] text-[#245a3a]"><Svg d="M5 12.5l4.5 4.5L19 7.5" size={14} stroke={2.6} /><span className="sr-only">Yes</span></span>
                        ) : (
                          <span className="text-[#b9b3a4]" aria-label="Not included">&mdash;</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ─── The section ─────────────────────────────────────────────────────────────

export default function Stay() {
  const [rooms, setRooms] = useState<StayRoom[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let off = false;
    fetch('/api/availability')
      .then((r) => r.json())
      .then((d) => {
        if (off) return;
        if (!Array.isArray(d.rooms)) return setStatus('error');
        setRooms(
          d.rooms.map((r: Partial<StayRoom> & { id: string; name: string }) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? null,
            nightlyRate: r.nightlyRate ?? 0,
            maxGuests: r.maxGuests ?? 2,
            includedGuests: r.includedGuests ?? 2,
            extraGuestRate: r.extraGuestRate ?? 0,
            units: r.units ?? 1,
            photos: Array.isArray(r.photos) ? r.photos : [],
            amenities: Array.isArray(r.amenities) ? r.amenities : [],
          })),
        );
        setStatus('ready');
      })
      .catch(() => !off && setStatus('error'));
    return () => {
      off = true;
    };
  }, [attempt]);

  return (
    <section id="stay" className={`${sans.className} scroll-mt-20 bg-[#f7f3ec] px-5 py-20 text-[#1f2f26] md:px-12 md:py-28 lg:px-16`}>
      <style>{CSS}</style>
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className={`${script.className} text-3xl font-semibold text-[#a8431f] md:text-4xl`}>Where you&rsquo;ll stay</p>
          <h2 className={`${serif.className} mt-1 text-5xl leading-[1.05] md:text-7xl`}>Pick your room</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4a5a50] md:text-lg">
            See what each room has, then book it directly with us. No middlemen, no extra fees.
          </p>
        </Reveal>

        <div className="mt-10 space-y-8 md:mt-14 md:space-y-10">
          {status === 'loading' &&
            [0, 1].map((i) => <div key={i} className="st-skeleton h-[420px] rounded-[2rem]" aria-hidden="true" />)}

          {status === 'error' && (
            <div className="rounded-[2rem] border border-[#e9e2d2] bg-white p-8 text-center">
              <p className="text-base font-semibold">We could not load the rooms right now.</p>
              <button type="button" onClick={() => { setStatus('loading'); setAttempt((n) => n + 1); }}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#1f2f26] px-6 text-sm font-bold text-white transition hover:bg-[#2f4a3a]">
                Try again
              </button>
            </div>
          )}

          {status === 'ready' && rooms.length === 0 && (
            <div className="rounded-[2rem] border border-[#e9e2d2] bg-white p-8 text-center">
              <p className="text-base font-semibold">Our rooms will be listed here soon.</p>
              <Link href="/booking" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#a8431f] px-6 text-sm font-bold text-white transition hover:bg-[#8f3716]">
                Send a booking request
              </Link>
            </div>
          )}

          {status === 'ready' &&
            rooms.map((room, i) => (
              <Reveal key={room.id}>
                <RoomCard room={room} flip={i % 2 === 1} />
              </Reveal>
            ))}
        </div>

        {status === 'ready' && (
          <Reveal>
            <Compare rooms={rooms} />
          </Reveal>
        )}
      </div>
    </section>
  );
}
