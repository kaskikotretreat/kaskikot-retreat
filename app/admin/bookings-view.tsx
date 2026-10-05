// app/admin/bookings-view.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatPrice } from '../lib/pricing';
import { addDays, card, danger, fmtDate, localToday, nightsOf, Pill, plural, primary } from './ui';
import type { Act, Booking, Data } from './ui';

function Stat({ title, value, hint, tone, icon }: { title: string; value: number; hint: string; tone: string; icon: ReactNode }) {
  return (
    <div className={`${card} flex items-center gap-4 p-4`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function BookingCard({ b, act, busy }: { b: Booking; act: Act; busy: boolean }) {
  const [emailGuest, setEmailGuest] = useState(true);
  const digits = (b.phone ?? '').replace(/\D/g, '');
  const nights = nightsOf(b.checkIn, b.checkOut);
  const initials = (b.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const edge = b.status === 'pending' ? 'border-l-amber-400' : b.status === 'confirmed' ? 'border-l-emerald-500' : 'border-l-slate-300';
  const pill =
    b.status === 'pending' ? <Pill tone="amber">Needs reply</Pill> :
    b.status === 'confirmed' ? <Pill tone="green">Accepted</Pill> :
    b.status === 'declined' ? <Pill tone="red">Declined</Pill> : <Pill tone="slate">Cancelled</Pill>;

  const change = (status: 'confirmed' | 'declined' | 'cancelled', question: string) => {
    if (window.confirm(question)) act({ action: 'setStatus', id: b.id, status, emailGuest: emailGuest && !!b.email });
  };

  return (
    <article className={`${card} border-l-4 ${edge} p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{b.name}</p>
            {pill}
          </div>
          <p className="text-xs text-slate-500">{b.reference}{b.nationality ? ` · ${b.nationality}` : ''}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs font-semibold text-slate-500">Room</p><p className="font-medium text-slate-900">{b.roomName}</p></div>
        <div><p className="text-xs font-semibold text-slate-500">Stay</p><p className="font-medium text-slate-900">{fmtDate(b.checkIn)} to {fmtDate(b.checkOut)}</p><p className="text-xs text-slate-500">{plural(nights, 'night')}{b.guests ? ` · ${plural(b.guests, 'guest')}` : ''}</p></div>
        <div><p className="text-xs font-semibold text-slate-500">Estimate</p><p className="font-medium text-slate-900">{b.totalPrice != null ? formatPrice(b.totalPrice) : 'No price'}</p>{b.priceNote && <p className="text-xs text-slate-500">{b.priceNote}</p>}</div>
      </div>

      {b.arrivalTime && <p className="mt-3 text-sm text-slate-600">Arrival: {b.arrivalTime}</p>}
      {b.specialRequests && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{b.specialRequests}</p>}

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {b.email && <a className="font-medium text-emerald-700 underline underline-offset-2" href={`mailto:${b.email}`}>{b.email}</a>}
        {b.phone && <a className="font-medium text-emerald-700 underline underline-offset-2" href={`tel:${b.phone}`}>{b.phone}</a>}
        {digits && <a className="font-medium text-emerald-700 underline underline-offset-2" href={`https://wa.me/${digits}`}>WhatsApp</a>}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {b.status === 'pending' && (
          <>
            <button type="button" disabled={busy} className={primary} onClick={() => change('confirmed', 'Accept this booking?')}>Accept booking</button>
            <button type="button" disabled={busy} className={danger} onClick={() => change('declined', 'Decline this request? The dates will open up again.')}>Decline</button>
            {b.email && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={emailGuest} onChange={(e) => setEmailGuest(e.target.checked)} className="h-4 w-4 accent-emerald-700" /> Email the guest
              </label>
            )}
          </>
        )}
        {b.status === 'confirmed' && (
          <button type="button" disabled={busy} className={danger} onClick={() => change('cancelled', 'Cancel this booking? The dates will open up again.')}>Cancel booking</button>
        )}
        {(b.status === 'declined' || b.status === 'cancelled') && <span className="text-sm text-slate-500">No action needed.</span>}
      </div>
    </article>
  );
}

export default function BookingsView({ data, act, busy }: { data: Data; act: Act; busy: boolean }) {
  const [tab, setTab] = useState<'pending' | 'accepted' | 'past'>('pending');
  const today = localToday();

  const pending = data.bookings.filter((b) => b.status === 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const accepted = data.bookings.filter((b) => b.status === 'confirmed' && b.checkOut >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = data.bookings
    .filter((b) => b.status !== 'blocked' && b.status !== 'pending' && !(b.status === 'confirmed' && b.checkOut >= today))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const arriving = accepted.filter((b) => b.checkIn >= today && b.checkIn <= addDays(today, 7)).length;
  const live = data.rooms.filter((r) => r.active).length;

  const lists = { pending, accepted, past };
  const tabs = [['pending', 'Needs reply'], ['accepted', 'Accepted'], ['past', 'Past and closed']] as const;
  const empty = {
    pending: 'No new requests. You are all caught up.',
    accepted: 'No accepted bookings yet.',
    past: 'Nothing here yet.',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Needs reply" value={pending.length} hint="New requests" tone="bg-amber-100 text-amber-800" icon={<span className="text-xl font-bold">!</span>} />
        <Stat title="Accepted" value={accepted.length} hint="Upcoming stays" tone="bg-emerald-100 text-emerald-800" icon={<span className="text-xl font-bold">✓</span>} />
        <Stat title="Arriving soon" value={arriving} hint="Within 7 days" tone="bg-sky-100 text-sky-800" icon={<span className="text-xl font-bold">→</span>} />
        <Stat title="Rooms live" value={live} hint="Shown on the website" tone="bg-violet-100 text-violet-800" icon={<span className="text-xl font-bold">⌂</span>} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-200/70 p-1.5 sm:inline-flex">
        {tabs.map(([key, text]) => (
          <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {text} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${key === 'pending' && lists[key].length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{lists[key].length}</span>
          </button>
        ))}
      </div>

      {lists[tab].length === 0 && <div className={`${card} p-10 text-center text-sm text-slate-500`}>{empty[tab]}</div>}
      <div className="space-y-4">
        {lists[tab].map((b) => <BookingCard key={`${b.id}:${b.status}`} b={b} act={act} busy={busy} />)}
      </div>
    </div>
  );
}
