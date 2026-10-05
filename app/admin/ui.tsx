// app/admin/ui.tsx
// Shared types, styles and small components for the admin screens.
import type { ReactNode } from 'react';

export type Room = { id: string; name: string; description: string | null; nightlyRate: number; active: boolean };
export type Pkg = { id: string; roomId: string; name: string; nights: number; price: number; active: boolean };
export type Booking = {
  id: number; reference: string; roomId: string; roomName: string; checkIn: string; checkOut: string; status: string;
  name: string | null; email: string | null; phone: string | null; nationality: string | null; guests: number | null;
  arrivalTime: string | null; specialRequests: string | null; totalPrice: number | null; priceNote: string | null; createdAt: string;
};
export type Data = { rooms: Room[]; packages: Pkg[]; bookings: Booking[] };
export type Act = (body: Record<string, unknown>, success?: string) => Promise<boolean>;
export type Say = (kind: 'ok' | 'err', text: string) => void;

export const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
export const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25';
export const label = 'mb-1 block text-xs font-semibold text-slate-600';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50';
export const primary = `${btn} bg-emerald-700 text-white hover:bg-emerald-800`;
export const secondary = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
export const danger = `${btn} border border-red-300 bg-white text-red-700 hover:bg-red-50`;

export const toNumber = (v: string) => {
  const n = parseInt(v.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const localToday = () => ymd(new Date());
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const ICONS = {
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  bed: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 18l-6-6 6-6',
  check: 'M20 6 9 17l-5-5',
  chevronRight: 'M9 18l6-6-6-6',
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Switch({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      {text}
    </button>
  );
}

export function Pill({ tone, children }: { tone: 'green' | 'amber' | 'slate' | 'sky' | 'red'; children: ReactNode }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-900',
    slate: 'bg-slate-200 text-slate-700',
    sky: 'bg-sky-100 text-sky-900',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
