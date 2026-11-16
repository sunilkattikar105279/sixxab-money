'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { browserClient } from '@/lib/supabase/browser';
import { track } from '@/lib/track';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState('/my-money');

  // ?join=1 opens sign-up; ?ref=CODE is kept until onboarding so the friend who invited them gets credit.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('join') || q.get('ref')) setMode('up');
    const ref = q.get('ref');
    if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) try { localStorage.setItem('sixxab_ref', ref.toLowerCase()); } catch { /* storage off */ }
    const n = q.get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) setNext(n);
  }, []);

  const redirect = () => `${location.origin}/auth/callback`;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const sb = browserClient();
    if (mode === 'up') {
      track('signup_submitted', { method: 'password' });
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } });
      setMsg(error ? error.message : 'Almost there: open the email we just sent and tap the link to confirm your account.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message); else { router.push(`/onboarding?next=${encodeURIComponent(next)}`); router.refresh(); }
    }
    setBusy(false);
  }

  async function magicLink() {
    if (!email) return setMsg('Enter your email first.');
    setBusy(true); setMsg(null);
    track('signup_submitted', { method: 'magic_link' });
    const { error } = await browserClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
    setMsg(error ? error.message : 'Check your email: tap the link and you are in. No password needed.');
    setBusy(false);
  }

  return (
    <main className="wrap" id="main" style={{ maxWidth: 460, paddingTop: 48 }}>
      <Link href="/" aria-label="SIXXAB Money home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sixxab-money-logo.png" alt="SIXXAB Money" style={{ height: 44 }} />
      </Link>
      <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {mode === 'up' && <div className="tag gold">Founding members join free</div>}
        {mode === 'in' && next !== '/my-money' && <p className="muted" style={{ margin: 0 }}>Sign in to open your money dashboard.</p>}
        <h1 style={{ fontSize: 24 }}>{mode === 'in' ? 'Sign in' : 'Join SIXXAB Money free'}</h1>
        {mode === 'up' && <p className="muted" style={{ margin: 0 }}>Your personal money coach, plain-English market briefs and a 90-day plan for US and India. Takes under a minute.</p>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password {mode === 'up' && <span className="dim">(8+ characters)</span>}</label>
        <input id="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-gold" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create my free account'}</button>
        <button type="button" className="btn btn-line" disabled={busy} onClick={magicLink} style={{ justifyContent: 'center' }}>Email me a sign-in link instead</button>
        {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
        <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} style={{ background: 'none', border: 0, color: 'var(--teal)', cursor: 'pointer', minHeight: 44, font: 'inherit' }}>
          {mode === 'in' ? 'New here? Join free' : 'Already a member? Sign in'}
        </button>
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>
          Free, no card needed. Ages 11–17 join through a parent. Your data is private and never sold. By joining you agree to our <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy policy</Link>. Education only, not investment advice.
        </p>
      </form>
    </main>
  );
}
