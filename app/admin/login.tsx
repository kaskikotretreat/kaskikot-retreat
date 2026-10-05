// app/admin/login.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { field, label, primary } from './ui';

type View = 'password' | 'code' | 'forgot' | 'sent';

export default function Login({ configured, hint, onDone }: { configured: boolean; hint: string; onDone: () => void }) {
  const [view, setView] = useState<View>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const post = async (url: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Something went wrong.');
      return res.ok ? data : null;
    } catch {
      setError('Could not reach the server.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = await post('/api/admin/session', view === 'code' ? { ticket, code } : { password });
    if (!data) return;
    if (data.needsCode) {
      setTicket(data.ticket);
      setView('code');
    } else onDone();
  };

  const sendReset = async () => {
    if (await post('/api/admin/reset', { action: 'request' })) setView('sent');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1f18] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">Kaskikot Retreat</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {view === 'code' ? 'Enter your code' : view === 'forgot' || view === 'sent' ? 'Reset password' : 'Admin login'}
        </h1>

        {!configured && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            The admin password has not been set up yet. Add ADMIN_PASSWORD and ADMIN_SECRET, then restart.
          </p>
        )}

        {(view === 'password' || view === 'code') && (
          <form onSubmit={signIn} className="mt-5 space-y-4">
            {view === 'password' ? (
              <div>
                <label htmlFor="pw" className={label}>Password</label>
                <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
            ) : (
              <div>
                <label htmlFor="code" className={label}>6-digit code from your authenticator app</label>
                <input id="code" inputMode="text" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} className={`${field} tracking-widest`} />
                <p className="mt-2 text-xs text-slate-500">Lost your phone? Type one of your recovery codes instead.</p>
              </div>
            )}
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={loading || (view === 'password' ? !password : !code)} className={`${primary} w-full`}>
              {loading ? 'Checking…' : view === 'code' ? 'Verify and log in' : 'Log in'}
            </button>
            {view === 'password' ? (
              <button type="button" onClick={() => { setError(''); setView('forgot'); }} className="w-full text-center text-sm font-medium text-emerald-700 underline underline-offset-4">
                Forgot password?
              </button>
            ) : (
              <button type="button" onClick={() => { setError(''); setCode(''); setView('password'); }} className="w-full text-center text-sm font-medium text-slate-600 underline underline-offset-4">
                Start again
              </button>
            )}
          </form>
        )}

        {view === 'forgot' && (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-slate-700">
              We will email a reset link to the admin address{hint ? <> <strong>{hint}</strong></> : ''}. The link works once and expires in 30 minutes.
            </p>
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <button type="button" onClick={sendReset} disabled={loading} className={`${primary} w-full`}>{loading ? 'Sending…' : 'Email me a reset link'}</button>
            <button type="button" onClick={() => setView('password')} className="w-full text-center text-sm font-medium text-slate-600 underline underline-offset-4">Back to login</button>
          </div>
        )}

        {view === 'sent' && (
          <div className="mt-5 space-y-4">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
              A reset link is on its way{hint ? <> to <strong>{hint}</strong></> : ''}. Open it on this device, and check the spam folder if you do not see it.
            </p>
            <button type="button" onClick={() => setView('password')} className="w-full text-center text-sm font-medium text-slate-600 underline underline-offset-4">Back to login</button>
          </div>
        )}
      </div>
    </div>
  );
}
