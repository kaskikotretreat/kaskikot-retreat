'use client';
// app/components/hero-search.tsx
// The horizontal "room / dates / guests" bar in the hero. It does not book anything itself:
// it sends the guest to /booking with their choices already filled in.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import RangeCalendar from './range-calendar';

type RoomOption = { id: string; name: string; nightlyRate: number; maxGuests: number };

// ─── Date helpers (ISO strings: YYYY-MM-DD) ──────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const t = new Date(); // the guest's own "today"
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};
const nightsBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};
const pretty = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

// "Today" differs between server and browser, so it is read through useSyncExternalStore:
// empty during the server render, real value afterwards, and no hydration mismatch.
const noSubscribe = () => () => {};
const useToday = () => useSyncExternalStore(noSubscribe, todayISO, () => '');

// ─── Icons ───────────────────────────────────────────────────────────────────
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const BedIcon = () => (
  <Icon>
    <path d="M3 18V7" />
    <path d="M3 14h18v4" />
    <path d="M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.6" />
  </Icon>
);
const CalendarIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Icon>
);
const CalendarCheckIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
    <path d="m9.5 15 1.8 1.8 3.4-3.4" />
  </Icon>
);
const GuestsIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16.5 14.6c2.6.2 4.1 2 4.5 5" />
  </Icon>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

const VALUE = 'block truncate text-[15px] font-semibold leading-snug text-[#1b2e23]';
const OVERLAY = 'absolute inset-0 h-full w-full cursor-pointer opacity-0';
const NO_BLOCKS = new Set<string>();

const iconCircle = 'grid size-9 shrink-0 place-items-center rounded-full bg-[#e3eee4] text-[#2f6b4a] sm:size-10';
const smallLabel = 'block whitespace-nowrap text-[11px] font-bold uppercase tracking-[.14em] text-[#5b6a60]';


// ─── One cell of the bar ─────────────────────────────────────────────────────
const SEGMENT =
  'relative flex items-center gap-2.5 rounded-2xl px-3 py-3 sm:gap-3 sm:px-4 transition-colors hover:bg-[#f6f2e9] focus-within:bg-[#efe9db] focus-within:ring-2 focus-within:ring-[#2f6b4a]/50 max-lg:border max-lg:border-[#e6dfd0] lg:rounded-full';

function Segment({ icon, label, children, className = '' }: { icon: ReactNode; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${SEGMENT} ${className}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e3eee4] sm:size-10 text-[#2f6b4a]">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className={smallLabel}>{label}</span>
        {children}
      </span>
    </div>
  );
}

export default function HeroSearch() {
  const router = useRouter();
  const today = useToday();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [open, setOpen] = useState(false);
  const [booked, setBooked] = useState<{ room: string; nights: Set<string> } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Room names and prices come from the same list the booking form uses.
  useEffect(() => {
    let off = false;
    fetch('/api/availability')
      .then((r) => r.json())
      .then((d) => {
        if (off || !Array.isArray(d.rooms)) return;
        setRooms(d.rooms.map((r: RoomOption) => ({ id: r.id, name: r.name, nightlyRate: r.nightlyRate, maxGuests: r.maxGuests ?? 10 })));
      })
      .catch(() => {}); // the bar still works with "Any room"
    return () => {
      off = true;
    };
  }, []);

  // With a room chosen, its booked nights are struck through in the calendar (as on the booking page).
  useEffect(() => {
    if (!roomId) return;
    let off = false;
    fetch(`/api/availability?room=${encodeURIComponent(roomId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!off) setBooked({ room: roomId, nights: new Set(Array.isArray(d.blocked) ? d.blocked : []) });
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [roomId]);
  const blocked = roomId && booked?.room === roomId ? booked.nights : NO_BLOCKS;

  // Close the calendar on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const room = rooms.find((r) => r.id === roomId);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  // The guest count is capped by the chosen room (or by the biggest room when none is chosen).
  const maxGuests = room ? room.maxGuests : rooms.length ? Math.max(...rooms.map((r) => r.maxGuests)) : 10;
  const guestCount = Math.min(guests, maxGuests);

  const go = (e: FormEvent) => {
    e.preventDefault();
    if (checkIn && !checkOut) {
      setOpen(true); // finish choosing the check-out day first
      return;
    }
    const q = new URLSearchParams();
    if (roomId) q.set('room', roomId);
    if (checkIn && checkOut) {
      q.set('checkIn', checkIn);
      q.set('checkOut', checkOut);
    }
    q.set('guests', String(guestCount));
    router.push(`/booking?${q.toString()}`);
  };

  return (
    <form
      onSubmit={go}
      aria-label="Check availability"
      className="grid grid-cols-2 gap-2 rounded-[1.75rem] bg-white p-2 shadow-[0_18px_50px_-12px_rgba(10,50,40,.45)] ring-1 ring-black/5 lg:grid-cols-[1.25fr_2.1fr_1.05fr_auto] lg:items-center lg:gap-0 lg:divide-x lg:divide-[#eee8db] lg:rounded-full lg:p-2.5"
    >
      <Segment icon={<BedIcon />} label="Room type" className="col-span-2 lg:col-span-1">
        <span className={VALUE}>{room ? room.name : 'Any room'}</span>
        <select aria-label="Room type" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={OVERLAY}>
          <option value="">Any room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.nightlyRate > 0 ? ` · Rs ${r.nightlyRate.toLocaleString('en-IN')} / night` : ''}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5b6a60" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Segment>

      {/* One field for both dates, with one calendar (same as the booking page) */}
      <div ref={pickerRef} className="relative col-span-2 lg:col-span-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`grid w-full grid-cols-2 rounded-2xl text-left transition-colors hover:bg-[#f6f2e9] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#2f6b4a] max-lg:border max-lg:border-[#e6dfd0] lg:rounded-full ${
            open ? 'bg-[#efe9db] ring-2 ring-[#2f6b4a]/50' : ''
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-4">
            <span className={iconCircle}><CalendarIcon /></span>
            <span className="min-w-0 flex-1">
              <span className={smallLabel}>Check-in</span>
              <span className={`${VALUE} ${checkIn ? '' : '!font-medium text-[#6b786f]'}`}>{checkIn ? pretty(checkIn) : 'Add date'}</span>
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2.5 border-l border-[#eee8db] px-3 py-3 sm:gap-3 sm:px-4">
            <span className={iconCircle}><CalendarCheckIcon /></span>
            <span className="min-w-0 flex-1">
              <span className={smallLabel}>Check-out</span>
              <span className={`${VALUE} ${checkOut ? '' : '!font-medium text-[#6b786f]'}`}>
                {checkOut ? pretty(checkOut) : 'Add date'}
                {nights > 0 && <span className="hidden font-medium text-[#5b6a60] sm:inline"> · {nights}&nbsp;{nights === 1 ? 'night' : 'nights'}</span>}
              </span>
            </span>
          </span>
        </button>

        {open && today && (
          <div
            role="dialog"
            aria-label="Choose your dates"
            className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-[#e6e0d5] bg-white p-4 text-[#2b2b2b] shadow-xl lg:bottom-full lg:right-auto lg:top-auto lg:mb-4 lg:mt-0 lg:w-[660px]"
          >
            <RangeCalendar
              today={today}
              checkIn={checkIn}
              checkOut={checkOut}
              blocked={blocked}
              onChange={(ci, co) => {
                setCheckIn(ci);
                setCheckOut(co);
              }}
              onDone={() => setOpen(false)}
            />
          </div>
        )}
      </div>

      <Segment icon={<GuestsIcon />} label="Guests" className="col-span-2 sm:col-span-1">
        <span className="flex items-center justify-between gap-2">
          <span className={VALUE} aria-live="polite">
            {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGuests(Math.max(1, guestCount - 1))}
              disabled={guestCount <= 1}
              aria-label="Fewer guests"
              className="grid size-7 place-items-center rounded-full border border-[#cfd8cf] text-lg leading-none text-[#1b2e23] transition hover:bg-white disabled:opacity-35"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setGuests(Math.min(maxGuests, guestCount + 1))}
              disabled={guestCount >= maxGuests}
              aria-label="More guests"
              className="grid size-7 place-items-center rounded-full border border-[#cfd8cf] text-lg leading-none text-[#1b2e23] transition hover:bg-white disabled:opacity-35"
            >
              +
            </button>
          </span>
        </span>
      </Segment>

      <div className="col-span-2 sm:col-span-1 lg:col-span-1 lg:pl-2.5">
        <button
          type="submit"
          className="flex h-full min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#a8431f] px-7 text-[15px] font-bold text-white transition hover:bg-[#8f3716] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8431f] active:scale-[.98] lg:h-14 lg:rounded-full"
        >
          <SearchIcon />
          Check availability
        </button>
      </div>
    </form>
  );
}
