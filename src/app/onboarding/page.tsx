'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GOALS, type GoalId } from '@/lib/growth';
import { track } from '@/lib/track';
import { StageQuiz } from '@/components/StageQuiz';
import { trackFor, type QuizAnswers } from '@/lib/curriculum';
import { STAGES } from '@/lib/sixs';

export default function Onboarding() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState<'US' | 'IN'>('US');
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<number | null | undefined>(undefined);
  const [quiz, setQuiz] = useState<QuizAnswers | null>(null);
  const [stage, setStage] = useState<number>(1);
  const [quizLoaded, setQuizLoaded] = useState(0);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((j) => {
      if (!j.user) router.replace('/login?join=1');
      else if (j.profile) {
        const n = new URLSearchParams(location.search).get('next');
        router.replace(n && n.startsWith('/') && !n.startsWith('//') ? n : '/my-money');
      }
    });
    try { const q = localStorage.getItem('sixxab_quiz'); if (q) { setQuiz(JSON.parse(q)); setQuizLoaded(1); } } catch { /* ignore */ }
    // Guess the country from the browser time zone; the member can change it.
    try { if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Kolkata') setCountry('IN'); } catch { /* ignore */ }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!acceptTerms) return setMsg('Please agree to the Terms and Privacy policy to continue.');
    setBusy(true);
    let ref: string | undefined;
    try { ref = localStorage.getItem('sixxab_ref') ?? undefined; } catch { /* storage off */ }
    const r = await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: fullName || undefined, dob, country, goal: goal ?? undefined, acceptTerms, emailUpdates, ref, quiz: quiz ?? undefined }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error);
    try { localStorage.removeItem('sixxab_ref'); } catch { /* ignore */ }
    track('onboarding_done', { country, goal: goal ?? 'none', referred: !!ref });
    if (j.status === 'pending_parent_consent') return setMsg('Thanks! Because you are under 18, a parent or guardian needs to join SIXXAB Money and link your account before you can start. Ask them to sign up and choose “Teach my kids about money”.');
    setStage(j.stage ?? 1);
    try { localStorage.removeItem('sixxab_quiz'); } catch { /* ignore */ }
    setWelcome(j.foundingNumber ?? null);
  }

  if (welcome !== undefined) {
    return (
      <main className="wrap" id="main" style={{ maxWidth: 520, paddingTop: 60 }}>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
          <div className="tag gold">{welcome ? `Founding member #${welcome} of 100` : 'Welcome aboard'}</div>
          <h1 style={{ fontSize: 28 }}>You&apos;re in{fullName ? `, ${fullName.split(' ')[0]}` : ''}!</h1>
          <p className="muted" style={{ margin: 0 }}>{welcome ? 'SIXXAB Money is free for you, for good, as one of our first 100 members. ' : ''}You start at <b>Stage {stage} · {STAGES.find((x) => x.n === stage)?.name}</b>. Your 12-week track and 90-day plan are ready.</p>
          <div className="inset" style={{ textAlign: 'left', width: '100%' }}><div className="tag teal">This week · lesson 1</div><p style={{ margin: '6px 0 0' }}><b>{trackFor(stage).lessons[0].title}</b>: {trackFor(stage).lessons[0].action}</p></div>
          <button className="btn btn-gold" onClick={() => { router.push('/my-money'); router.refresh(); }}>Open my money dashboard</button>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap" id="main" style={{ maxWidth: 520, paddingTop: 48 }}>
      <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="tag teal">Step 2 of 2 · under a minute</div>
        <h1 style={{ fontSize: 24 }}>Welcome to SIXXAB Money</h1>
        <p className="muted" style={{ margin: 0 }}>A few details so your coach can find your stage, use the right currency and build your first plan.</p>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>What do you want help with first?</legend>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {GOALS.map((g) => (
              <label key={g.id} className="inset" style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, cursor: 'pointer', border: `1px solid ${goal === g.id ? 'var(--teal)' : 'var(--line2)'}` }}>
                <input type="radio" name="goal" value={g.id} checked={goal === g.id} onChange={() => setGoal(g.id)} style={{ width: 18, minHeight: 18 }} /> {g.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>Find your starting stage {quiz ? <span className="dim">(answers from your quiz, change any)</span> : null}</legend>
          <StageQuiz compact key={quizLoaded} initial={quiz ?? undefined} onResult={(_, a) => setQuiz(a)} />
        </fieldset>

        <label htmlFor="name">First name (optional)</label>
        <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="given-name" />
        <label htmlFor="dob">Date of birth <span className="dim">(sets your age-appropriate experience)</span></label>
        <input id="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 10 }}>
          <legend style={{ marginBottom: 6 }}>Country</legend>
          {(['US', 'IN'] as const).map((c) => (
            <label key={c} className="inset" style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, border: `1px solid ${country === c ? 'var(--teal)' : 'var(--line2)'}` }}>
              <input type="radio" name="country" value={c} checked={country === c} onChange={() => setCountry(c)} style={{ width: 18, minHeight: 18 }} /> {c === 'US' ? 'United States (USD)' : 'India (INR)'}
            </label>
          ))}
        </fieldset>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ width: 18, minHeight: 18, marginTop: 3 }} />
          <span>I agree to the <Link href="/legal/terms" target="_blank">Terms</Link> and <Link href="/legal/privacy" target="_blank">Privacy policy</Link>, and understand SIXXAB Money is education, not investment advice.</span>
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)} style={{ width: 18, minHeight: 18, marginTop: 3 }} />
          <span className="muted">Email me the weekly money brief and new features (unsubscribe anytime).</span>
        </label>

        <button className="btn btn-gold" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Setting up…' : 'Start my journey'}</button>
        {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
      </form>
    </main>
  );
}
