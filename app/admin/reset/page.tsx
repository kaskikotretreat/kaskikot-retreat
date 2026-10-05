'use client';

// app/admin/reset/page.tsx
// The page the "forgot password" email link opens.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { field, label, primary } from '../ui';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== again) return setError('The two passwords do not match.');
    setLoading(true);
    setError('');
    try {
      const token = new URLSearchParams(window.location.search).get('token') ?? '';
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', token, password }),
      });
      if (res.ok) setDone(true);
      else setError((await res.json().catch(() => ({}))).error || 'Something went wrong.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1f18] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">Kaskikot Retreat</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{done ? 'Password changed' : 'Choose a new password'}</h1>
        {done ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Your password has been changed. If you use two-factor, you will still need your code to log in.</p>
            <a href="/admin" className={`${primary} w-full`}>Go to login</a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div><label className={label} htmlFor="p1">New password</label><input id="p1" type="password" autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div><label className={label} htmlFor="p2">Repeat new password</label><input id="p2" type="password" autoComplete="new-password" className={field} value={again} onChange={(e) => setAgain(e.target.value)} /></div>
            <p className="text-xs text-slate-500">At least 12 characters. A few random words works well.</p>
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={loading || !password || !again} className={`${primary} w-full`}>{loading ? 'Saving…' : 'Save new password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
