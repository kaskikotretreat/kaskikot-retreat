// app/admin/rooms-view.tsx
// Rooms on the left, the selected room's settings and packages on the right.
import { useState } from 'react';
import { formatPrice } from '../lib/pricing';
import { AMENITIES, CUSTOM_ICON } from '../lib/room-content';
import PhotoManager from './photo-manager';
import { card, danger, field, Icon, label, Pill, plural, primary, secondary, SectionTitle, Switch, toNumber } from './ui';
import type { Act, Data, Pkg, Room, Say } from './ui';

function PackageRow({ pkg, roomId, nightly, act, busy, onDone }: {
  pkg: Pkg | null; roomId: string; nightly: number; act: Act; busy: boolean; onDone?: () => void;
}) {
  const [name, setName] = useState(pkg?.name ?? 'Weekly stay');
  const [nights, setNights] = useState(String(pkg?.nights ?? 7));
  const [price, setPrice] = useState(pkg ? String(pkg.price) : '');
  const [active, setActive] = useState(pkg?.active ?? true);

  const n = toNumber(nights);
  const total = toNumber(price);
  const saving = nightly > 0 && n > 0 ? nightly * n - total : 0;

  const save = async () => {
    if (await act({ action: 'savePackage', id: pkg?.id, roomId, name, nights: n, price: total, active })) onDone?.();
  };
  const remove = async () => {
    if (pkg && window.confirm(`Remove "${pkg.name}"? Guests will no longer see it.`)) await act({ action: 'deletePackage', id: pkg.id });
  };

  return (
    <div className={`rounded-xl border p-4 ${pkg ? 'border-slate-200 bg-slate-50' : 'border-emerald-300 bg-emerald-50/50'}`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_90px_150px]">
        <div><label className={label}>Package name</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={label}>Nights</label><input className={field} inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} /></div>
        <div><label className={label}>Total price (Rs)</label><input className={field} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {n > 0 && total > 0 ? `${formatPrice(Math.round(total / n))} per night` : 'Enter the nights and the total price'}
        {saving > 0 && <span className="font-semibold text-emerald-700"> · guests save {formatPrice(saving)}</span>}
        {saving < 0 && <span className="font-semibold text-red-700"> · costs more than the nightly price</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Switch checked={active} onChange={setActive} text="Show on website" />
        <span className="flex-1" />
        <button type="button" onClick={save} disabled={busy} className={primary}>{pkg ? 'Save package' : 'Add package'}</button>
        {pkg ? <button type="button" onClick={remove} disabled={busy} className={danger}>Remove</button>
             : <button type="button" onClick={onDone} className={secondary}>Cancel</button>}
      </div>
    </div>
  );
}

function RoomForm({ room, packages, act, say, refresh, busy }: {
  room: Room | null; packages: Pkg[]; act: Act; say: Say; refresh: () => void; busy: boolean;
}) {
  const [name, setName] = useState(room?.name ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [rate, setRate] = useState(room ? String(room.nightlyRate) : '');
  const [active, setActive] = useState(room?.active ?? true);
  const [maxGuests, setMaxGuests] = useState(String(room?.maxGuests ?? 4));
  const [included, setIncluded] = useState(String(room?.includedGuests ?? 2));
  const [extraRate, setExtraRate] = useState(room ? String(room.extraGuestRate) : '');
  const [units, setUnits] = useState(String(room?.units ?? 1));
  const [adding, setAdding] = useState(false);
  const knownIds = AMENITIES.map((a) => a.id);
  const [picked, setPicked] = useState<string[]>((room?.amenities ?? []).filter((a) => knownIds.includes(a)));
  const [custom, setCustom] = useState((room?.amenities ?? []).filter((a) => !knownIds.includes(a)).join(', '));
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const maxN = toNumber(maxGuests);
  const incN = toNumber(included);
  const extraN = toNumber(extraRate);
  const unitsN = toNumber(units);
  const unitsInvalid = unitsN < 1 || unitsN > 50;
  const guestsInvalid = maxN < 1 || incN < 1 || incN > maxN;

  return (
    <div className="space-y-5">
      <section className={`${card} p-5`}>
        <h3 className="text-base font-bold text-slate-900">{room ? 'Room details' : 'New room'}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
          <div><label className={label}>Room name</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garden Cottage" /></div>
          <div><label className={label}>Price per night (Rs)</label><input className={field} inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" /></div>
        </div>
        <div className="mt-4">
          <label className={label}>Short description (optional)</label>
          <input className={field} value={description} maxLength={140} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to guests under the room name" />
        </div>
        <p className="mt-2 text-xs text-slate-500">A price of 0 means guests see no price for this room.</p>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-900">How many of this room?</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><label className={label}>Number of identical rooms</label><input className={field} inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value)} /></div>
          </div>
          <p className={`mt-2 text-xs ${unitsInvalid ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
            {unitsInvalid
              ? 'Enter a whole number from 1 to 50.'
              : unitsN === 1
                ? 'A single room. Once it is booked for a night, no one else can book that night.'
                : `You have ${unitsN} of this room. Guests see it as available until all ${unitsN} are booked for a night. Same price, photos and facilities for all.`}
          </p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-900">Guests</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><label className={label}>Most guests allowed</label><input className={field} inputMode="numeric" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} /></div>
            <div><label className={label}>Guests included in the price</label><input className={field} inputMode="numeric" value={included} onChange={(e) => setIncluded(e.target.value)} /></div>
            <div><label className={label}>Each extra guest, per night (Rs)</label><input className={field} inputMode="numeric" value={extraRate} onChange={(e) => setExtraRate(e.target.value)} placeholder="0" /></div>
          </div>
          <p className={`mt-2 text-xs ${guestsInvalid ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
            {guestsInvalid
              ? 'Guests included cannot be more than the most guests allowed.'
              : maxN > incN && extraN > 0
                ? `Up to ${incN} ${incN === 1 ? 'guest stays' : 'guests stay'} for the normal price. Guest ${incN + 1}${maxN > incN + 1 ? ` to ${maxN}` : ''} adds ${formatPrice(extraN)} per night each.`
                : maxN > incN
                  ? `Guests above ${incN} stay free, because the extra price is 0.`
                  : `This room takes up to ${maxN} ${maxN === 1 ? 'guest' : 'guests'}, all included in the price.`}
          </p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          {room ? (
            <PhotoManager roomId={room.id} photos={room.photos} act={act} say={say} refresh={refresh} busy={busy} />
          ) : (
            <>
              <h4 className="text-sm font-bold text-slate-900">Photos</h4>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Save the room first, then you can add its photos here.</p>
            </>
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-900">What this room has</h4>
          <p className="mt-1 text-xs text-slate-500">Tick only what this room offers. Each room can have a different list.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AMENITIES.map((a) => {
              const on = picked.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${on ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true"><path d={a.icon} /></svg>
                  <span className="min-w-0 flex-1 leading-tight">{a.label}</span>
                  {on && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CUSTOM_ICON} /></svg>}
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <label className={label}>Anything else (separate with commas)</label>
            <input className={field} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Sunrise from the window, Fireplace" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <Switch checked={active} onChange={setActive} text={active ? 'Visible on website' : 'Hidden from website'} />
          <span className="flex-1" />
          <button type="button" disabled={busy || !name.trim() || guestsInvalid || unitsInvalid} className={primary}
            onClick={() => act({ action: 'saveRoom', id: room?.id, name, description, nightlyRate: toNumber(rate), maxGuests: maxN, includedGuests: incN, extraGuestRate: extraN, units: unitsN,
              amenities: [...AMENITIES.map((a) => a.id).filter((id) => picked.includes(id)), ...custom.split(',')], active })}>
            {room ? 'Save room' : 'Add room'}
          </button>
        </div>
      </section>

      {room && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Packages</h3>
              <p className="text-sm text-slate-500">Weekly, monthly or any fixed-length deal for this room.</p>
            </div>
            {!adding && <button type="button" onClick={() => setAdding(true)} className={secondary}><Icon name="plus" className="h-4 w-4" /> Add package</button>}
          </div>
          <div className="mt-4 space-y-3">
            {packages.length === 0 && !adding && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No packages yet. Guests pay the nightly price.</p>}
            {packages.map((p) => (
              <PackageRow key={`${p.id}:${p.name}:${p.nights}:${p.price}:${p.active}`} pkg={p} roomId={room.id} nightly={room.nightlyRate} act={act} busy={busy} />
            ))}
            {adding && <PackageRow pkg={null} roomId={room.id} nightly={room.nightlyRate} act={act} busy={busy} onDone={() => setAdding(false)} />}
          </div>
        </section>
      )}
    </div>
  );
}

export default function RoomsView({ data, act, say, refresh, busy }: { data: Data; act: Act; say: Say; refresh: () => void; busy: boolean }) {
  const [selected, setSelected] = useState<string | null>(null); // null on a phone = show the list
  const current = selected ?? data.rooms[0]?.id ?? 'new';
  const room = data.rooms.find((r) => r.id === current) ?? null;
  const packagesFor = (id: string) => data.packages.filter((p) => p.roomId === id);

  return (
    <div>
      <SectionTitle title="Rooms and prices" />
      <div className="grid gap-5 md:grid-cols-[300px_1fr] md:items-start">
        <aside className={`${card} overflow-hidden ${selected !== null ? 'hidden md:block' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-900">{plural(data.rooms.length, 'room')}</p>
            <button type="button" onClick={() => setSelected('new')} className={`${primary} !px-3 !py-1.5`}><Icon name="plus" className="h-4 w-4" /> Add room</button>
          </div>
          <ul>
            {data.rooms.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelected(r.id)} aria-current={current === r.id}
                  className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left transition ${current === r.id ? 'border-emerald-600 bg-emerald-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{r.name}</span>
                    <span className="block text-xs text-slate-500">
                      {r.nightlyRate > 0 ? `${formatPrice(r.nightlyRate)} / night` : 'No price set'} · up to {plural(r.maxGuests, 'guest')}{r.units > 1 ? ` · ${r.units} rooms` : ''}
                    </span>
                  </span>
                  <Pill tone={r.active ? 'green' : 'slate'}>{r.active ? 'Live' : 'Hidden'}</Pill>
                  <Icon name="chevronRight" className="h-4 w-4 text-slate-400 md:hidden" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={selected === null ? 'hidden md:block' : ''}>
          <button type="button" onClick={() => setSelected(null)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-emerald-700 md:hidden">
            <Icon name="back" className="h-4 w-4" /> All rooms
          </button>
          {current === 'new' || !room ? (
            <RoomForm key="new" room={null} packages={[]} act={act} say={say} refresh={refresh} busy={busy} />
          ) : (
            <RoomForm key={`${room.id}:${room.name}:${room.description}:${room.nightlyRate}:${room.maxGuests}:${room.includedGuests}:${room.extraGuestRate}:${room.units}:${room.amenities.join('|')}:${room.active}`} room={room} packages={packagesFor(room.id)} act={act} say={say} refresh={refresh} busy={busy} />
          )}
        </section>
      </div>
    </div>
  );
}
