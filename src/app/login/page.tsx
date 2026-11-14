'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase/browser';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const sb = browserClient();
    if (mode === 'up') {
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      setMsg(error ? error.message : 'Check your email to confirm your account, then come back and sign in.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message); else { router.push('/onboarding'); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <main className="wrap" style={{ maxWidth: 440, paddingTop: 60 }}>
      <Link href="/" aria-label="SIXXAB Money home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sixxab-money-logo.png" alt="SIXXAB Money" style={{ height: 44 }} />
      </Link>
      <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <h1 style={{ fontSize: 24 }}>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-gold" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
        <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ background: 'none', border: 0, color: 'var(--teal)', cursor: 'pointer', minHeight: 44, font: 'inherit' }}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>Members aged 11 to 17 need a parent to link their account. Your data is private, exportable and never sold.</p>
      </form>
    </main>
  );
}
