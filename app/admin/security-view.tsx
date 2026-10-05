// app/admin/security-view.tsx
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { card, danger, field, label, Pill, primary, secondary, SectionTitle } from './ui';
import type { Say } from './ui';

type Status = { twoFactor: boolean; codesLeft: number; passwordChanged: boolean };

export default function SecurityView({ say, onLoggedOut }: { say: Say; onLoggedOut: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');

  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [offPassword, setOffPassword] = useState('');
  const [offCode, setOffCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/security')
      .then(async (r) => {
        if (r.status === 401) return onLoggedOut();
        const d = await r.json();
        if (!cancelled && typeof d.twoFactor === 'boolean') setStatus(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reload, onLoggedOut]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onLoggedOut();
        return null;
      }
      if (!res.ok) {
        say('err', d.error || 'Something went wrong.');
        return null;
      }
      if (d.message) say('ok', d.message);
      return d;
    } catch {
      say('err', 'Could not reach the server.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (next !== again) return say('err', 'The new passwords do not match.');
    if (await post({ action: 'changePassword', current, next })) {
      setCurrent('');
      setNext('');
      setAgain('');
      setReload((n) => n + 1);
    }
  };

  const startSetup = async () => {
    const d = await post({ action: 'startTwoFactor' });
    if (d) setSetup({ secret: d.secret, uri: d.uri });
  };

  const enable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = await post({ action: 'enableTwoFactor', code });
    if (d) {
      setCodes(d.codes);
      setSetup(null);
      setCode('');
      setReload((n) => n + 1);
    }
  };

  const disable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await post({ action: 'disableTwoFactor', password: offPassword, code: offCode })) {
      setOffPassword('');
      setOffCode('');
      setReload((n) => n + 1);
    }
  };

  const copyCodes = async () => {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch {
      say('err', 'Could not copy. Please write the codes down instead.');
    }
  };

  return (
    <div className="max-w-2xl">
      <SectionTitle title="Security" />
      <div className="space-y-5">
        {codes && (
          <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
            <h3 className="text-base font-bold text-amber-950">Save your recovery codes now</h3>
            <p className="mt-1 text-sm text-amber-900">
              If you lose your phone, each of these codes lets you log in once. They are shown only this one time. Keep them somewhere safe, such as a password manager.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm text-slate-900">
              {codes.map((c) => <li key={c} className="rounded-lg bg-white px-3 py-2 text-center font-semibold">{c}</li>)}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={copyCodes} className={secondary}>{copied ? 'Copied' : 'Copy codes'}</button>
              <button type="button" onClick={() => { setCodes(null); setCopied(false); }} className={primary}>I have saved them</button>
            </div>
          </section>
        )}

        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Password</h3>
            {status && <Pill tone={status.passwordChanged ? 'green' : 'amber'}>{status.passwordChanged ? 'Changed' : 'Starting password'}</Pill>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {status && !status.passwordChanged ? 'You are still using the password from the setup. Please choose your own.' : 'Changing it logs you out of other devices.'}
          </p>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <div><label className={label} htmlFor="cur">Current password</label><input id="cur" type="password" autoComplete="current-password" className={field} value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="new">New password</label><input id="new" type="password" autoComplete="new-password" className={field} value={next} onChange={(e) => setNext(e.target.value)} /></div>
              <div><label className={label} htmlFor="again">Repeat new password</label><input id="again" type="password" autoComplete="new-password" className={field} value={again} onChange={(e) => setAgain(e.target.value)} /></div>
            </div>
            <p className="text-xs text-slate-500">At least 12 characters. A few random words works well.</p>
            <button type="submit" disabled={busy || !current || !next || !again} className={primary}>Change password</button>
          </form>
        </section>

        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Two-factor authentication</h3>
            {status && <Pill tone={status.twoFactor ? 'green' : 'slate'}>{status.twoFactor ? 'On' : 'Off'}</Pill>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Adds a 6-digit code from your phone when you log in, so a stolen password is not enough. Works with Google Authenticator, Microsoft Authenticator or Authy.
          </p>

          {status && !status.twoFactor && !setup && (
            <button type="button" onClick={startSetup} disabled={busy} className={`${primary} mt-4`}>Set up two-factor</button>
          )}

          {setup && (
            <form onSubmit={enable} className="mt-4 space-y-4">
              <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700">
                <li>
                  Open your authenticator app and choose <strong>Add account</strong>, then <strong>Enter a setup key</strong>. Use this key:
                  <p className="mt-2 select-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-base font-semibold tracking-wider text-slate-900">
                    {setup.secret.match(/.{1,4}/g)?.join(' ')}
                  </p>
                  <a href={setup.uri} className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">
                    On the phone you will log in with? Tap here to add it automatically
                  </a>
                </li>
                <li>
                  Type the 6-digit code the app shows:
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} className={`${field} mt-2 max-w-[180px] text-center text-lg tracking-widest`} value={code} onChange={(e) => setCode(e.target.value)} />
                </li>
              </ol>
              <div className="flex gap-3">
                <button type="submit" disabled={busy || code.replace(/\s/g, '').length !== 6} className={primary}>Turn on two-factor</button>
                <button type="button" onClick={() => { setSetup(null); setCode(''); }} className={secondary}>Cancel</button>
              </div>
            </form>
          )}

          {status?.twoFactor && (
            <form onSubmit={disable} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">{status.codesLeft} recovery {status.codesLeft === 1 ? 'code' : 'codes'} left.</p>
              <p className="text-sm font-semibold text-slate-800">Turn off two-factor</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={label} htmlFor="offpw">Password</label><input id="offpw" type="password" autoComplete="current-password" className={field} value={offPassword} onChange={(e) => setOffPassword(e.target.value)} /></div>
                <div><label className={label} htmlFor="offcode">Code from your app</label><input id="offcode" autoComplete="one-time-code" className={field} value={offCode} onChange={(e) => setOffCode(e.target.value)} /></div>
              </div>
              <button type="submit" disabled={busy || !offPassword || !offCode} className={danger}>Turn off two-factor</button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
