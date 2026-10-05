'use client';

// app/admin/page.tsx
import { useCallback, useEffect, useState } from 'react';
import BookingsView from './bookings-view';
import CalendarView from './calendar-view';
import Login from './login';
import RoomsView from './rooms-view';
import SecurityView from './security-view';
import { Icon } from './ui';
import type { Act, Data, IconName, Say } from './ui';

type View = 'bookings' | 'rooms' | 'calendar' | 'security';
const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'bookings', label: 'Bookings', icon: 'inbox' },
  { id: 'rooms', label: 'Rooms and prices', icon: 'bed' },
  { id: 'calendar', label: 'Block dates', icon: 'calendar' },
  { id: 'security', label: 'Security', icon: 'shield' },
];

export default function AdminPage() {
  const [session, setSession] = useState<'checking' | 'out' | 'in'>('checking');
  const [configured, setConfigured] = useState(true);
  const [hint, setHint] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>('bookings');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setConfigured(d.configured !== false);
        setHint(typeof d.resetHint === 'string' ? d.resetHint : '');
        setSession(d.authed ? 'in' : 'out');
      })
      .catch(() => !cancelled && setSession('out'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session !== 'in') return;
    let cancelled = false;
    fetch('/api/admin')
      .then(async (r) => {
        if (r.status === 401) return setSession('out');
        const d = await r.json();
        if (cancelled) return;
        if (Array.isArray(d.rooms)) setData(d);
        else setToast({ kind: 'err', text: d.error || 'Could not load the data.' });
      })
      .catch(() => !cancelled && setToast({ kind: 'err', text: 'Could not reach the server.' }));
    return () => {
      cancelled = true;
    };
  }, [session, reload]);

  const say: Say = useCallback((kind, text) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const loggedOut = useCallback(() => {
    setData(null);
    setSession('out');
  }, []);

  const act: Act = async (body, success) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        loggedOut();
        return false;
      }
      if (!res.ok) {
        say('err', d.error || 'Something went wrong.');
        if (res.status === 409) setReload((n) => n + 1);
        return false;
      }
      say('ok', d.message || success || 'Saved.');
      setReload((n) => n + 1);
      return true;
    } catch {
      say('err', 'Could not reach the server.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    loggedOut();
  };

  if (session === 'checking') return <p className="mt-24 text-center text-sm text-slate-500">Loading…</p>;
  if (session === 'out') return <Login configured={configured} hint={hint} onDone={() => setSession('in')} />;

  const pending = data?.bookings.filter((b) => b.status === 'pending').length ?? 0;
  const badge = (id: View) => (id === 'bookings' && pending > 0 ? pending : 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:pl-64">
      {/* Sidebar (tablet and desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#0f1f18] p-4 md:flex">
        <div className="px-2 py-4">
          <p className="text-lg font-bold text-white">Kaskikot</p>
          <p className="text-xs font-medium text-emerald-300">Admin dashboard</p>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)} aria-current={view === n.id}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${view === n.id ? 'bg-emerald-600 text-white' : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'}`}>
              <Icon name={n.icon} />
              <span className="flex-1">{n.label}</span>
              {badge(n.id) > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">{badge(n.id)}</span>}
            </button>
          ))}
        </nav>
        <button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:bg-white/10 hover:text-white">
          <Icon name="logout" /> Log out
        </button>
      </aside>

      {/* Top bar (phones) */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#0f1f18] px-4 py-3 md:hidden">
        <p className="font-bold text-white">Kaskikot admin</p>
        <button type="button" onClick={logout} className="flex items-center gap-2 text-sm font-semibold text-emerald-100"><Icon name="logout" className="h-4 w-4" /> Log out</button>
      </header>

      <main className="mx-auto max-w-6xl p-4 pb-28 md:p-8">
        {toast && (
          <button type="button" onClick={() => setToast(null)} role="status"
            className={`fixed right-4 top-16 z-50 max-w-sm rounded-xl px-4 py-3 text-left text-sm font-medium shadow-lg md:top-4 ${toast.kind === 'ok' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>
            {toast.text}
          </button>
        )}

        {view === 'security' ? <SecurityView say={say} onLoggedOut={loggedOut} /> : !data ? (
          <p className="py-20 text-center text-sm text-slate-500">Loading…</p>
        ) : view === 'bookings' ? <BookingsView data={data} act={act} busy={busy} />
          : view === 'rooms' ? <RoomsView data={data} act={act} busy={busy} />
          : <CalendarView data={data} act={act} busy={busy} />}
      </main>

      {/* Bottom bar (phones) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-[#0f1f18] md:hidden">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => setView(n.id)} aria-current={view === n.id}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${view === n.id ? 'text-emerald-300' : 'text-emerald-100/70'}`}>
            <Icon name={n.icon} className="h-5 w-5" />
            {n.id === 'rooms' ? 'Rooms' : n.id === 'calendar' ? 'Block' : n.label}
            {badge(n.id) > 0 && <span className="absolute right-1/4 top-1.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">{badge(n.id)}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
