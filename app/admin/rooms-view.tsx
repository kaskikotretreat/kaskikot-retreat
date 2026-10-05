// app/admin/rooms-view.tsx
// Rooms on the left, the selected room's settings and packages on the right.
import { useState } from 'react';
import { formatPrice } from '../lib/pricing';
import { card, danger, field, Icon, label, Pill, plural, primary, secondary, SectionTitle, Switch, toNumber } from './ui';
import type { Act, Data, Pkg, Room } from './ui';

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

function RoomForm({ room, packages, act, busy }: { room: Room | null; packages: Pkg[]; act: Act; busy: boolean }) {
  const [name, setName] = useState(room?.name ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [rate, setRate] = useState(room ? String(room.nightlyRate) : '');
  const [active, setActive] = useState(room?.active ?? true);
  const [adding, setAdding] = useState(false);

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
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <Switch checked={active} onChange={setActive} text={active ? 'Visible on website' : 'Hidden from website'} />
          <span className="flex-1" />
          <button type="button" disabled={busy || !name.trim()} className={primary}
            onClick={() => act({ action: 'saveRoom', id: room?.id, name, description, nightlyRate: toNumber(rate), active })}>
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

export default function RoomsView({ data, act, busy }: { data: Data; act: Act; busy: boolean }) {
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
                      {r.nightlyRate > 0 ? `${formatPrice(r.nightlyRate)} / night` : 'No price set'} · {plural(packagesFor(r.id).length, 'package')}
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
            <RoomForm key="new" room={null} packages={[]} act={act} busy={busy} />
          ) : (
            <RoomForm key={`${room.id}:${room.name}:${room.description}:${room.nightlyRate}:${room.active}`} room={room} packages={packagesFor(room.id)} act={act} busy={busy} />
          )}
        </section>
      </div>
    </div>
  );
}
