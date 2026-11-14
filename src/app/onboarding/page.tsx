'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState<'US' | 'IN'>('US');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((j) => {
      if (!j.user) router.replace('/login');
      else if (j.profile) router.replace('/my-money');
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName, dob, country }) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error);
    if (j.status === 'pending_parent_consent') return setMsg('Thanks! Because you are under 18, a parent needs to create their own account and link yours before you can start.');
    router.push('/my-money'); router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 480, paddingTop: 60 }}>
      <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Welcome to SIXXAB Money</h1>
        <p className="muted" style={{ margin: 0 }}>Three details so your coach can find your stage and use the right currency.</p>
        <label htmlFor="name">Your name (optional)</label>
        <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        <label htmlFor="dob">Date of birth</label>
        <input id="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 10 }}>
          <legend style={{ marginBottom: 6 }}>Country</legend>
          {(['US', 'IN'] as const).map((c) => (
            <label key={c} className="inset" style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, border: `1px solid ${country === c ? 'var(--teal)' : 'var(--line2)'}` }}>
              <input type="radio" name="country" value={c} checked={country === c} onChange={() => setCountry(c)} style={{ width: 18, minHeight: 18 }} /> {c === 'US' ? 'United States (USD)' : 'India (INR)'}
            </label>
          ))}
        </fieldset>
        <button className="btn btn-gold" type="submit" style={{ justifyContent: 'center' }}>Start my journey</button>
        {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
      </form>
    </main>
  );
}
