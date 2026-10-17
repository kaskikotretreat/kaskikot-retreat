'use client';
// app/components/range-calendar.tsx
// The same single-range calendar as the booking page: click check-in, then check-out,
// with the stay highlighted, booked nights struck through, and a hover preview.
import { useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};
const utcDate = (iso: string) => {
  const { y, m, d } = parseISO(iso);
  return new Date(Date.UTC(y, m, d));
};
const formatLong = (iso: string) =>
  utcDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthTitle = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shiftMonth = (view: { y: number; m: number }, n: number) => {
  const t = view.y * 12 + view.m + n;
  return { y: Math.floor(t / 12), m: t % 12 };
};

const BAND = '#dfe9e1';

type MonthProps = {
  year: number;
  month: number;
  today: string;
  checkIn: string;
  checkOut: string;
  hover: string;
  blocked: Set<string>;
  maxCheckOut: string;
  onPick: (iso: string) => void;
  onHover: (iso: string) => void;
};

function Month({ year, month, today, checkIn, checkOut, hover, blocked, maxCheckOut, onPick, onHover }: MonthProps) {
  const leading = new Date(year, month, 1).getDay(); // weeks start on Sunday
  const count = new Date(year, month + 1, 0).getDate();
  const rangeEnd = checkOut || (checkIn && hover > checkIn ? hover : '');

  return (
    <div className="flex-1">
      <div className="flex h-9 items-center justify-center text-sm font-semibold text-[#2b2b2b]">{monthTitle(year, month)}</div>
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
          const choosingCheckOut = !!checkIn && !checkOut && iso > checkIn;
          const booked = !choosingCheckOut && blocked.has(iso);
          const disabled = iso < today || booked || (choosingCheckOut && !!maxCheckOut && iso > maxCheckOut);
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const isPreviewEnd = !checkOut && !!rangeEnd && iso === rangeEnd;
          const inRange = !!checkIn && !!rangeEnd && iso > checkIn && iso < rangeEnd;

          let band: string | undefined;
          if (inRange) band = BAND;
          else if (isStart && rangeEnd) band = `linear-gradient(to right, transparent 50%, ${BAND} 50%)`;
          else if ((isEnd || isPreviewEnd) && checkIn) band = `linear-gradient(to left, transparent 50%, ${BAND} 50%)`;

          let tone = 'text-[#2b2b2b] hover:bg-[#eef2ee]';
          if (disabled) {
            // Booked nights get a grey chip; days out of reach for this stay a lighter one; past days stay faint text.
            tone = booked
              ? 'cursor-not-allowed bg-[#e4e1da] text-[#8a857a] line-through'
              : iso >= today
                ? 'cursor-not-allowed bg-[#f1efea] text-[#b3aea2]'
                : 'cursor-not-allowed text-[#c4beb1]';
          }
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

type Props = {
  today: string;
  checkIn: string;
  checkOut: string;
  blocked: Set<string>; // nights already booked for the chosen room (empty = no restriction)
  onChange: (checkIn: string, checkOut: string) => void;
  onDone: () => void; // both dates chosen
};

/** The panel only. The parent decides where it appears (it mounts when opened, so it starts on the right month). */
export default function RangeCalendar({ today, checkIn, checkOut, blocked, onChange, onDone }: Props) {
  const [view, setView] = useState(() => {
    const base = parseISO(checkIn || today);
    return { y: base.y, m: base.m };
  });
  const [hover, setHover] = useState('');
  const nextView = shiftMonth(view, 1);
  const cur = parseISO(today);
  const atCurrentMonth = view.y === cur.y && view.m === cur.m;

  // You may leave on the morning of the next booked night, but not stay past it.
  let maxCheckOut = '';
  if (checkIn && !checkOut) for (const n of blocked) if (n > checkIn && (!maxCheckOut || n < maxCheckOut)) maxCheckOut = n;

  const pick = (iso: string) => {
    if (!checkIn || checkOut || iso <= checkIn) {
      onChange(iso, '');
      setHover('');
      return;
    }
    onChange(checkIn, iso);
    setTimeout(onDone, 280);
  };

  const monthProps = { today, checkIn, checkOut, hover, blocked, maxCheckOut, onPick: pick, onHover: setHover };
  const hint = !checkIn ? 'Choose check-in' : !checkOut ? 'Now choose check-out' : 'Tap a date to change';

  return (
    <div onMouseLeave={() => setHover('')}>
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
        <span className="min-w-0 text-[#6b6b6b]">
          {hint}
          {blocked.size > 0 && <span className="ml-3 inline-flex items-center gap-1.5 align-middle"><span className="inline-block size-3.5 rounded-full bg-[#e4e1da]" aria-hidden="true" />Booked</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange('', '');
            setHover('');
          }}
          disabled={!checkIn}
          className="shrink-0 whitespace-nowrap font-medium text-[#2f4a3a] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[#c4beb1] disabled:no-underline"
        >
          Clear dates
        </button>
      </div>
    </div>
  );
}