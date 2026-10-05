'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { formatPrice, quote } from '../lib/pricing';
import type { Pkg } from '../lib/pricing';

// ─── Date helpers (all dates are ISO strings: YYYY-MM-DD) ────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const todayISO = () => {
  const t = new Date(); // local time, so guests in Nepal get their own "today"
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
};
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};
const utcDate = (iso: string) => {
  const { y, m, d } = parseISO(iso);
  return new Date(Date.UTC(y, m, d));
};
const nightsBetween = (a: string, b: string) =>
  Math.round((utcDate(b).getTime() - utcDate(a).getTime()) / 86_400_000);
const addDaysISO = (iso: string, n: number) => {
  const d = utcDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const formatShort = (iso: string) =>
  utcDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatLong = (iso: string) =>
  utcDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthTitle = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shiftMonth = (view: { y: number; m: number }, n: number) => {
  const t = view.y * 12 + view.m + n;
  return { y: Math.floor(t / 12), m: t % 12 };
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ─── Styles (brand: forest green #2f4a3a, soft green band #dfe9e1) ───────────

const BAND = '#dfe9e1';
const ARRIVAL_WINDOWS = [
  'Morning (before 12 pm)',
  'Afternoon (12 – 4 pm)',
  'Evening (4 – 8 pm)',
  'Late evening (after 8 pm)',
];
const inputClass =
  'mt-1 w-full rounded-lg border border-[#d9d2c3] bg-white px-3 py-1.5 text-sm text-[#2b2b2b] outline-none transition focus:border-[#2f4a3a] focus:ring-2 focus:ring-[#2f4a3a]/20';
const labelClass = 'block text-sm font-medium text-[#2b2b2b]';

// ─── One month of the calendar ───────────────────────────────────────────────

type MonthProps = {
  year: number;
  month: number;
  today: string;
  checkIn: string;
  checkOut: string;
  hover: string;
  blocked: Set<string>;
  maxCheckOut: string;
  packageNights: number; // 0 = free choice of dates
  onPick: (iso: string) => void;
  onHover: (iso: string) => void;
};

function Month({ year, month, today, checkIn, checkOut, hover, blocked, maxCheckOut, packageNights, onPick, onHover }: MonthProps) {
  const leading = new Date(year, month, 1).getDay(); // weeks start on Sunday
  const count = new Date(year, month + 1, 0).getDate();
  // While choosing check-out, preview the range up to the day under the pointer.
  const rangeEnd = checkOut || (checkIn && hover > checkIn ? hover : '');

  return (
    <div className="flex-1">
      <div className="flex h-9 items-center justify-center text-sm font-semibold text-[#2b2b2b]">
        {monthTitle(year, month)}
      </div>
      <div className="grid grid-cols-7 py-2 text-center text-xs text-[#6b6b6b]">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: leading }, (_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const iso = toISO(year, month, day);
          // A booked night cannot start a stay. While choosing check-out, you may leave on the
          // morning of the next booked night, but not stay past it.
          const choosingCheckOut = packageNights === 0 && !!checkIn && !checkOut && iso > checkIn;
          const booked = !choosingCheckOut && blocked.has(iso);
          let disabled = iso < today || booked || (choosingCheckOut && !!maxCheckOut && iso > maxCheckOut);
          if (!disabled && packageNights > 1) {
            // A package needs every one of its nights to be free from this start date.
            for (let k = 1; k < packageNights && !disabled; k++) disabled = blocked.has(addDaysISO(iso, k));
          }
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const isPreviewEnd = !checkOut && !!rangeEnd && iso === rangeEnd;
          const inRange = !!checkIn && !!rangeEnd && iso > checkIn && iso < rangeEnd;

          // The highlighted band runs behind the days; start and end get a half band.
          let band: string | undefined;
          if (inRange) band = BAND;
          else if (isStart && rangeEnd) band = `linear-gradient(to right, transparent 50%, ${BAND} 50%)`;
          else if ((isEnd || isPreviewEnd) && checkIn) band = `linear-gradient(to left, transparent 50%, ${BAND} 50%)`;

          let tone = 'text-[#2b2b2b] hover:bg-[#eef2ee]';
          if (disabled) tone = `cursor-not-allowed text-[#c4beb1]${booked ? ' line-through' : ''}`;
          else if (isStart || isEnd) tone = 'bg-[#2f4a3a] font-semibold text-white';
          else if (isPreviewEnd) tone = 'border-2 border-[#2f4a3a] font-semibold text-[#2f4a3a]';
          else if (inRange) tone = 'text-[#2f4a3a] hover:bg-[#cfdcd2]';

          return (
            <div key={iso} className="h-10" style={{ background: band }}>
              <button
                type="button"
                disabled={disabled}
                aria-label={booked ? `${formatLong(iso)}, booked` : formatLong(iso)}
                aria-pressed={isStart || isEnd}
                onClick={() => onPick(iso)}
                onMouseEnter={() => onHover(iso)}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3a] motion-reduce:transition-none ${tone} ${
                  iso === today && !isStart && !isEnd ? 'underline underline-offset-4' : ''
                }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function StayOption(props: { selected: boolean; onClick: () => void; title: string; detail: string; badge?: string }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onClick}
      className={`rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3a] ${
        props.selected ? 'border-[#2f4a3a] bg-[#eef3ef] ring-1 ring-[#2f4a3a]' : 'border-[#d9d2c3] bg-white hover:border-[#2f4a3a]'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-medium text-[#2b2b2b]">{props.title}</span>
        {props.badge && <span className="rounded-full bg-[#dfe9e1] px-2 py-0.5 text-xs font-medium text-[#2f4a3a]">{props.badge}</span>}
      </span>
      <span className="block text-xs text-[#6b6b6b]">{props.detail}</span>
    </button>
  );
}

type Confirmation = { reference: string; email: string; emailSent: boolean; checkIn: string; checkOut: string; room: string; price: string };
type RoomOption = { id: string; name: string; description: string | null; nightlyRate: number; available: boolean };

export default function BookingPage() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: 2026, m: 0 });
  const [hover, setHover] = useState('');
  const [today, setToday] = useState('');
  const [dateError, setDateError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState('');
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loadedKey, setLoadedKey] = useState(''); // which room's booked dates have finished loading
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [packageId, setPackageId] = useState('');
  const [freeFor, setFreeFor] = useState<{ key: string; ids: string[] } | null>(null);
  const datesRef = useRef({ checkIn: '', checkOut: '' });

  const pickerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const room = rooms.find((r) => r.id === roomId);
  const checking = !!roomId && loadedKey !== `${roomId}:${refresh}`;
  const datesKey = checkIn && checkOut ? `${checkIn}|${checkOut}` : '';
  const shownRooms = rooms.map((r) => ({
    ...r,
    available: freeFor && freeFor.key === datesKey ? freeFor.ids.includes(r.id) : true,
  }));
  const roomPackages = packages.filter((p) => p.roomId === roomId);
  const pkg = roomPackages.find((p) => p.id === packageId) ?? null;
  const packageNights = pkg ? pkg.nights : 0;
  const estimate = room && nights > 0 ? quote(nights, room.nightlyRate, pkg) : null;
  // Own dates that happen to match a cheaper package: offer a one-click switch.
  const betterPackage = !pkg && estimate ? roomPackages.find((p) => p.nights === nights && p.price < estimate.total) : undefined;

  useEffect(() => {
    datesRef.current = { checkIn, checkOut };
  });

  // Load the rooms once.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/availability')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.rooms)) return;
        setRooms(d.rooms);
        setPackages(Array.isArray(d.packages) ? d.packages : []);
        setRoomId((current) => current || d.rooms[0]?.id || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Nights already booked for the selected room. If the chosen dates clash, clear them.
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const key = `${roomId}:${refresh}`;
    fetch(`/api/availability?room=${encodeURIComponent(roomId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const taken: string[] = Array.isArray(d.blocked) ? d.blocked : [];
        setBlocked(new Set(taken));
        const { checkIn: ci, checkOut: co } = datesRef.current;
        if (ci && co && taken.some((n) => n >= ci && n < co)) {
          setCheckIn('');
          setCheckOut('');
          setNotice('Those dates are not available for this room. Please choose new dates.');
        }
      })
      .catch(() => !cancelled && setBlocked(new Set())) // the server re-checks when you submit
      .finally(() => !cancelled && setLoadedKey(key));
    return () => {
      cancelled = true;
    };
  }, [roomId, refresh]);

  // Which rooms are free for the chosen dates.
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    let cancelled = false;
    const key = `${checkIn}|${checkOut}`;
    fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.rooms)) return;
        const ids = d.rooms.filter((r: { available: boolean }) => r.available).map((r: { id: string }) => r.id);
        setFreeFor({ key, ids });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut]);

  // Close the calendar on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Short fade-and-rise when the calendar opens (skipped for reduced motion).
  useEffect(() => {
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    popoverRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(-6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [open]);

  // Bring the confirmation into view (the form is long on phones).
  useEffect(() => {
    if (confirmation) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [confirmation]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openCalendar = () => {
    const now = todayISO();
    const base = parseISO(checkIn || now);
    setToday(now);
    setView({ y: base.y, m: base.m });
    setOpen(true);
  };

  const pickDate = (iso: string) => {
    setDateError('');
    if (packageNights > 0) {
      // A package fixes the length, so one click sets both dates.
      setCheckIn(iso);
      setCheckOut(addDaysISO(iso, packageNights));
      setHover('');
      closeTimer.current = setTimeout(() => setOpen(false), 300);
      return;
    }
    // First click, a fresh start after a full range, or a date before check-in: set check-in.
    if (!checkIn || checkOut || iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut('');
      setHover('');
      return;
    }
    setCheckOut(iso);
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };

  const chooseRoom = (id: string) => {
    setRoomId(id);
    setPackageId('');
    setNotice('');
  };

  const chooseStay = (id: string) => {
    setPackageId(id);
    setNotice('');
    const next = packages.find((p) => p.id === id);
    if (next && nights !== next.nights) clearDates(); // a package has a fixed length
  };

  const clearDates = () => {
    setCheckIn('');
    setCheckOut('');
    setHover('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setDateError('Choose your check-in and check-out dates.');
      openCalendar();
      return;
    }

    if (!roomId) {
      setError('Please choose a room.');
      return;
    }

    setLoading(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        setConfirmation({
          reference: result.reference ?? '',
          room: rooms.find((r) => r.id === roomId)?.name ?? '',
          price: estimate ? formatPrice(estimate.total) : '',
          email: String(data.email),
          emailSent: result.guestEmailSent !== false,
          checkIn,
          checkOut,
        });
      } else {
        setError(result.error || `Something went wrong (error ${res.status}). Please try again.`);
        if (res.status === 409) {
          clearDates();
          setRefresh((n) => n + 1); // reload the booked dates
        }
      }
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const startAnother = () => {
    setConfirmation(null);
    clearDates();
    setGuests(2);
    setRefresh((n) => n + 1);
  };

  // ── Confirmation view ──
  if (confirmation) {
    return (
      <div ref={cardRef} className="mx-auto my-10 max-w-2xl rounded-2xl border border-[#e6e0d5] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dfe9e1] text-[#2f4a3a]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[#2b2b2b]">Request sent</h2>
        <p className="mx-auto mt-2 max-w-md text-[#6b6b6b]">
          {confirmation.emailSent
            ? `We sent a copy to ${confirmation.email}. We will reply once we have checked availability.`
            : 'We have your request and will reply once we have checked availability. Your copy email could not be sent, so please save your reference below.'}
        </p>
        {confirmation.reference && (
          <div className="mx-auto mt-6 max-w-xs rounded-xl border border-dashed border-[#2f4a3a] bg-[#f7f3ec] px-4 py-3">
            <div className="text-xs text-[#6b6b6b]">Booking reference</div>
            <div className="text-xl font-semibold tracking-wider text-[#2f4a3a]">{confirmation.reference}</div>
          </div>
        )}
        <p className="mt-6 text-[#2b2b2b]">
          {formatShort(confirmation.checkIn)} to {formatShort(confirmation.checkOut)}
          <span className="text-[#6b6b6b]"> · {plural(nightsBetween(confirmation.checkIn, confirmation.checkOut), 'night')}{confirmation.room ? ` · ${confirmation.room}` : ''}{confirmation.price ? ` · Estimated ${confirmation.price}` : ''}</span>
        </p>
        <button
          type="button"
          onClick={startAnother}
          className="mt-8 rounded-lg border border-[#2f4a3a] px-5 py-2.5 text-sm font-medium text-[#2f4a3a] transition hover:bg-[#2f4a3a] hover:text-white"
        >
          Make another request
        </button>
      </div>
    );
  }

  // ── Booking form ──
  const nextView = shiftMonth(view, 1);
  const atCurrentMonth = !!today && view.y * 12 + view.m <= parseISO(today).y * 12 + parseISO(today).m;
  // While choosing check-out, the first booked night after check-in is the latest day you can leave.
  const maxCheckOut = checkIn && !checkOut ? ([...blocked].filter((n) => n > checkIn).sort()[0] ?? '') : '';
  const monthProps = { today, checkIn, checkOut, hover, blocked, maxCheckOut, packageNights, onPick: pickDate, onHover: setHover };

  let calendarHint = packageNights ? `Choose a start date for your ${plural(packageNights, 'night')}` : 'Select your check-in date';
  if (checkIn && !checkOut) calendarHint = 'Now select your check-out date';
  if (nights > 0) calendarHint = plural(nights, 'night');
  if (checking) calendarHint = 'Checking availability…';

  return (
    <div className="mx-auto my-10 max-w-2xl rounded-2xl border border-[#e6e0d5] bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold text-[#2b2b2b]">Book your stay</h1>
      <p className="mt-1 text-sm text-[#6b6b6b]">We will confirm availability before anything is final.</p>

      {error && (
        <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>Full name</label>
            <input id="name" name="name" type="text" required autoComplete="name" className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Phone or WhatsApp</label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="Include country code" className={inputClass} />
          </div>
          <div>
            <label htmlFor="nationality" className={labelClass}>Nationality</label>
            <input id="nationality" name="nationality" type="text" required autoComplete="country-name" className={inputClass} />
          </div>
        </div>

        {/* Room first: it decides which dates are open */}
        <fieldset>
          <legend className={labelClass}>Room</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {rooms.length === 0 && <p className="text-sm text-[#6b6b6b] sm:col-span-3">Loading rooms…</p>}
            {shownRooms.map((r) => {
              const selected = r.id === roomId;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={!r.available}
                  aria-pressed={selected}
                  onClick={() => chooseRoom(r.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3a] ${
                    selected ? 'border-[#2f4a3a] bg-[#eef3ef] ring-1 ring-[#2f4a3a]' : 'border-[#d9d2c3] bg-white hover:border-[#2f4a3a]'
                  } ${!r.available ? 'cursor-not-allowed opacity-60 hover:border-[#d9d2c3]' : ''}`}
                >
                  <span className="block font-medium text-[#2b2b2b]">{r.name}</span>
                  {r.available && r.nightlyRate > 0 && (
                    <span className="block text-xs font-medium text-[#2f4a3a]">{formatPrice(r.nightlyRate)} per night</span>
                  )}
                  {(!r.available || r.description) && (
                    <span className="block text-xs text-[#6b6b6b]">{r.available ? r.description : 'Booked for your dates'}</span>
                  )}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="roomId" value={roomId} />
          <input type="hidden" name="packageId" value={packageId} />
        </fieldset>

        {/* Own dates, or a fixed-length package */}
        {roomPackages.length > 0 && (
          <fieldset>
            <legend className={labelClass}>Stay type</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <StayOption
                selected={!pkg}
                onClick={() => chooseStay('')}
                title="Choose your own dates"
                detail={room && room.nightlyRate > 0 ? `${formatPrice(room.nightlyRate)} per night` : 'Any length of stay'}
              />
              {roomPackages.map((p) => {
                const saving = room && room.nightlyRate > 0 ? room.nightlyRate * p.nights - p.price : 0;
                return (
                  <StayOption
                    key={p.id}
                    selected={p.id === packageId}
                    onClick={() => chooseStay(p.id)}
                    title={p.name}
                    detail={`${plural(p.nights, 'night')} · ${formatPrice(p.price)}`}
                    badge={saving > 0 ? `Save ${formatPrice(saving)}` : undefined}
                  />
                );
              })}
            </div>
          </fieldset>
        )}

        {/* One field for both dates */}
        <div ref={pickerRef} className="relative">
          <span className={labelClass}>Dates</span>
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : openCalendar())}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={`mt-1 grid w-full grid-cols-2 rounded-lg border bg-white text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f4a3a]/20 ${
              dateError ? 'border-red-400' : open ? 'border-[#2f4a3a] ring-2 ring-[#2f4a3a]/20' : 'border-[#d9d2c3] hover:border-[#2f4a3a]'
            }`}
          >
            <span className="px-3 py-1.5 text-sm">
              <span className="block text-xs text-[#6b6b6b]">Check-in</span>
              <span className={checkIn ? 'font-medium text-[#2b2b2b]' : 'text-[#9a9486]'}>
                {checkIn ? formatShort(checkIn) : 'Add date'}
              </span>
            </span>
            <span className="border-l border-[#d9d2c3] px-3 py-1.5 text-sm">
              <span className="block text-xs text-[#6b6b6b]">Check-out</span>
              <span className={checkOut ? 'font-medium text-[#2b2b2b]' : 'text-[#9a9486]'}>
                {checkOut ? formatShort(checkOut) : 'Add date'}
              </span>
            </span>
          </button>
          {dateError && <p className="mt-1.5 text-sm text-red-600">{dateError}</p>}
          {notice && <p className="mt-1.5 text-sm text-[#8a4b24]">{notice}</p>}

          <input type="hidden" name="checkIn" value={checkIn} />
          <input type="hidden" name="checkOut" value={checkOut} />

          {open && (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Choose your dates"
              onMouseLeave={() => setHover('')}
              className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-[#e6e0d5] bg-white p-4 shadow-xl md:right-auto md:w-[660px]"
            >
              <button
                type="button"
                onClick={() => setView(shiftMonth(view, -1))}
                disabled={atCurrentMonth}
                aria-label="Previous month"
                className="absolute left-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#2b2b2b] transition hover:bg-[#eef2ee] disabled:cursor-not-allowed disabled:text-[#c4beb1] disabled:hover:bg-transparent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setView(shiftMonth(view, 1))}
                aria-label="Next month"
                className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#2b2b2b] transition hover:bg-[#eef2ee]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>

              <div className="flex gap-8">
                <Month year={view.y} month={view.m} {...monthProps} />
                <div className="hidden flex-1 md:block">
                  <Month year={nextView.y} month={nextView.m} {...monthProps} />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#e6e0d5] pt-3 text-sm">
                <span className="text-[#6b6b6b]">
                  {calendarHint}
                  {blocked.size > 0 && <span className="ml-3 line-through opacity-70">Booked</span>}
                </span>
                <button
                  type="button"
                  onClick={clearDates}
                  disabled={!checkIn}
                  className="font-medium text-[#2f4a3a] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[#c4beb1] disabled:no-underline"
                >
                  Clear dates
                </button>
              </div>
            </div>
          )}
        </div>

        {estimate && (
          <div className="rounded-xl border border-[#d9d2c3] bg-[#f7f3ec] p-4" aria-live="polite">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[#6b6b6b]">Estimated total</p>
                <p className="text-sm text-[#2b2b2b]">{estimate.label}</p>
              </div>
              <p className="text-2xl font-semibold text-[#2f4a3a]">{formatPrice(estimate.total)}</p>
            </div>
            {estimate.savings > 0 && (
              <p className="mt-2 text-sm font-medium text-[#2f4a3a]">You save {formatPrice(estimate.savings)} with this package.</p>
            )}
            {betterPackage && (
              <button
                type="button"
                onClick={() => chooseStay(betterPackage.id)}
                className="mt-2 text-sm font-medium text-[#2f4a3a] underline underline-offset-4"
              >
                Switch to the {betterPackage.name} for {formatPrice(betterPackage.price)} and save {formatPrice(estimate.total - betterPackage.price)}
              </button>
            )}
            <p className="mt-2 text-xs text-[#6b6b6b]">Estimate only. We confirm the final amount when we reply.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className={labelClass}>Guests</span>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-[#d9d2c3] bg-white px-2 py-1">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label="Fewer guests"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d2c3] text-base leading-none text-[#2b2b2b] transition hover:border-[#2f4a3a] disabled:cursor-not-allowed disabled:text-[#c4beb1] disabled:hover:border-[#d9d2c3]"
              >
                −
              </button>
              <span className="text-sm font-medium text-[#2b2b2b]" aria-live="polite">{plural(guests, 'guest')}</span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(10, g + 1))}
                disabled={guests >= 10}
                aria-label="More guests"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d2c3] text-base leading-none text-[#2b2b2b] transition hover:border-[#2f4a3a] disabled:cursor-not-allowed disabled:text-[#c4beb1] disabled:hover:border-[#d9d2c3]"
              >
                +
              </button>
            </div>
            <input type="hidden" name="guests" value={guests} />
          </div>
          <div>
            <label htmlFor="arrivalTime" className={labelClass}>
              Arrival time <span className="font-normal text-[#6b6b6b]">(optional)</span>
            </label>
            <select id="arrivalTime" name="arrivalTime" defaultValue="" className={inputClass}>
              <option value="">Not sure yet</option>
              {ARRIVAL_WINDOWS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="specialRequests" className={labelClass}>
            Special requests or dietary needs <span className="font-normal text-[#6b6b6b]">(optional)</span>
          </label>
          <textarea id="specialRequests" name="specialRequests" rows={2} maxLength={1000} className={inputClass} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#2f4a3a] py-2.5 font-medium text-white transition hover:bg-[#263d30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Sending request…' : 'Send booking request'}
        </button>
      </form>
    </div>
  );
}