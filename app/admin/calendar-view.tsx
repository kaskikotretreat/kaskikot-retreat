// app/admin/calendar-view.tsx
// Block dates with a range calendar. It is a plain picker: as the owner you already know what is booked.
import { useState } from 'react';
import { addDays, card, danger, field, fmtDate, Icon, label, localToday, nightsOf, plural, primary, SectionTitle, ymd } from './ui';
import type { Act, Data } from './ui';

const BAND = '#d1fae5';
const shift = (v: { y: number; m: number }, n: number) => {
  const t = v.y * 12 + v.m + n;
  return { y: Math.floor(t / 12), m: t % 12 };
};

function Month({ y, m, today, start, end, hover, onPick, onHover }: {
  y: number; m: number; today: string; start: string; end: string; hover: string; onPick: (iso: string) => void; onHover: (iso: string) => void;
}) {
  const lead = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const rangeEnd = end || (start && hover > start ? hover : '');
  const title = new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="flex-1">
      <p className="flex h-9 items-center justify-center text-sm font-bold text-slate-900">{title}</p>
      <div className="grid grid-cols-7 py-2 text-center text-xs font-semibold text-slate-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} className="h-10" />)}
        {Array.from({ length: count }, (_, i) => {
          const iso = ymd(new Date(y, m, i + 1));
          const disabled = iso < today;
          const isStart = iso === start;
          const isEnd = iso === end;
          const preview = !end && !!rangeEnd && iso === rangeEnd;
          const inside = !!start && !!rangeEnd && iso > start && iso < rangeEnd;
          let band: string | undefined;
          if (inside) band = BAND;
          else if (isStart && rangeEnd) band = `linear-gradient(to right, transparent 50%, ${BAND} 50%)`;
          else if ((isEnd || preview) && start) band = `linear-gradient(to left, transparent 50%, ${BAND} 50%)`;
          let tone = 'text-slate-800 hover:bg-slate-100';
          if (disabled) tone = 'cursor-not-allowed text-slate-300';
          else if (isStart || isEnd) tone = 'bg-emerald-700 font-bold text-white';
          else if (preview) tone = 'border-2 border-emerald-700 font-bold text-emerald-800';
          else if (inside) tone = 'text-emerald-900 hover:bg-emerald-200';
          return (
            <div key={iso} className="h-10" style={{ background: band }}>
              <button type="button" disabled={disabled} onClick={() => onPick(iso)} onMouseEnter={() => onHover(iso)}
                aria-label={fmtDate(iso)} aria-pressed={isStart || isEnd}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${tone} ${iso === today && !isStart && !isEnd ? 'underline underline-offset-4' : ''}`}>
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ data, act, busy }: { data: Data; act: Act; busy: boolean }) {
  const today = localToday();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [roomId, setRoomId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [hover, setHover] = useState('');
  const [note, setNote] = useState('');

  const room = roomId || data.rooms[0]?.id || '';
  const nights = start && end ? nightsOf(start, end) : 0;
  const blocks = data.bookings.filter((b) => b.status === 'blocked' && b.checkOut >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const next = shift(view, 1);
  const atNow = view.y * 12 + view.m <= now.getFullYear() * 12 + now.getMonth();

  const pick = (iso: string) => {
    if (!start || end || iso <= start) {
      setStart(iso);
      setEnd('');
    } else setEnd(iso);
  };
  const submit = async () => {
    if (await act({ action: 'addBlock', roomId: room, checkIn: start, checkOut: end, note })) {
      setStart('');
      setEnd('');
      setNote('');
    }
  };
  const monthProps = { today, start, end, hover, onPick: pick, onHover: setHover };

  return (
    <div>
      <SectionTitle title="Block dates" />
      <p className="-mt-2 mb-4 text-sm text-slate-600">Use this for phone bookings, Airbnb guests or repairs. Guests will not be able to book these nights.</p>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className={`${card} p-5`}>
          <div className="mb-4">
            <p className={label}>1. Choose the room</p>
            <div className="flex flex-wrap gap-2">
              {data.rooms.map((r) => (
                <button key={r.id} type="button" aria-pressed={room === r.id} onClick={() => setRoomId(r.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${room === r.id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <p className={label}>2. Click the first night, then the check-out day</p>
          <div className="relative rounded-xl border border-slate-200 p-4" onMouseLeave={() => setHover('')}>
            <button type="button" aria-label="Previous month" disabled={atNow} onClick={() => setView(shift(view, -1))}
              className="absolute left-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"><Icon name="back" className="h-4 w-4" /></button>
            <button type="button" aria-label="Next month" onClick={() => setView(shift(view, 1))}
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"><Icon name="chevronRight" className="h-4 w-4" /></button>
            <div className="flex gap-8">
              <Month y={view.y} m={view.m} {...monthProps} />
              <div className="hidden flex-1 md:block"><Month y={next.y} m={next.m} {...monthProps} /></div>
            </div>
          </div>
        </section>

        <section className={`${card} p-5 lg:sticky lg:top-24`}>
          <p className={label}>3. Confirm</p>
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            {nights > 0 ? (
              <>
                <p className="font-semibold text-slate-900">{data.rooms.find((r) => r.id === room)?.name}</p>
                <p className="text-slate-700">{fmtDate(start)} to {fmtDate(end)}</p>
                <p className="mt-1 font-bold text-emerald-700">{plural(nights, 'night')} blocked</p>
                <p className="mt-1 text-xs text-slate-500">The last night is {fmtDate(addDays(end, -1))}. The room is free again on {fmtDate(end)}.</p>
              </>
            ) : <p className="text-slate-500">{start ? 'Now click the check-out day.' : 'Pick dates on the calendar.'}</p>}
          </div>
          <div className="mt-4">
            <label className={label} htmlFor="note">Note (only you see this)</label>
            <input id="note" className={field} value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Airbnb guest" />
          </div>
          <button type="button" disabled={busy || nights < 1 || !room} onClick={submit} className={`${primary} mt-4 w-full`}>Block these dates</button>
          {(start || end) && <button type="button" onClick={() => { setStart(''); setEnd(''); }} className="mt-2 w-full text-center text-sm font-medium text-slate-600 underline underline-offset-4">Clear selection</button>}
        </section>
      </div>

      <section className={`${card} mt-5 p-5`}>
        <h3 className="text-base font-bold text-slate-900">Currently blocked</h3>
        {blocks.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nothing is blocked right now.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{b.roomName}</p>
                  <p className="text-sm text-slate-600">{fmtDate(b.checkIn)} to {fmtDate(b.checkOut)} · {plural(nightsOf(b.checkIn, b.checkOut), 'night')}{b.name && b.name !== 'Blocked' ? ` · ${b.name}` : ''}</p>
                </div>
                <button type="button" disabled={busy} className={danger}
                  onClick={() => window.confirm('Open these dates again for guests?') && act({ action: 'deleteBlock', id: b.id })}>
                  Open dates again
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
