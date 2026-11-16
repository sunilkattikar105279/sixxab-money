'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Existing { name: string; market: string; minScore: number; riskPct: number; maxPositionPct: number; maxPositions: number; dailyLossPct: number; allowShort: boolean; withTrendOnly: boolean; broker: string }

export function StrategyForm({ country, ownerBroker, indiaAllowed, existing }: { country: 'US' | 'IN'; ownerBroker: boolean; indiaAllowed: boolean; existing?: Existing }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: existing?.name ?? 'My swing strategy',
    market: (existing?.market ?? (country === 'IN' && indiaAllowed ? 'IN' : 'US')) as 'US' | 'IN',
    minScore: existing?.minScore ?? 7,
    riskPct: existing?.riskPct ?? 1,
    maxPositionPct: existing?.maxPositionPct ?? 20,
    maxPositions: existing?.maxPositions ?? 5,
    dailyLossPct: existing?.dailyLossPct ?? 3,
    allowShort: existing?.allowShort ?? false,
    withTrendOnly: existing?.withTrendOnly ?? true,
    broker: (existing?.broker ?? 'paper') as 'paper' | 'alpaca',
  });
  const [ack, setAck] = useState(!!existing);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setMsg(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ack) return setMsg('Please confirm you understand these are simulated practice trades.');
    setBusy(true); setMsg(null);
    const r = await fetch('/api/strategy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, acknowledge: true }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg(j.error ?? 'Could not save.');
    setMsg(existing ? 'Rules updated. They apply from tonight’s scan.' : 'Auto-trading is on. Your first orders come after tonight’s scan.');
    router.refresh();
  }

  const per = country === 'IN' ? 1_000_000 : 10_000;
  const exampleRisk = Math.round((per * f.riskPct) / 100);
  const sym = country === 'IN' ? '₹' : '$';

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {indiaAllowed && !existing && (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 8 }}>
          <legend style={{ marginBottom: 6 }}>Market</legend>
          {(['US', 'IN'] as const).map((mk) => <label key={mk} className="inset" style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, border: `1px solid ${f.market === mk ? 'var(--teal)' : 'var(--line2)'}` }}><input type="radio" checked={f.market === mk} onChange={() => set('market', mk)} style={{ width: 18, minHeight: 18 }} /> {mk === 'US' ? 'US stocks' : 'India (NSE)'}</label>)}
        </fieldset>
      )}
      <Slider id="minScore" label="Minimum signal score" value={f.minScore} min={5} max={10} step={0.5} fmt={(v) => `${v}/10`} hint="Higher = fewer, stronger setups" onChange={(v) => set('minScore', v)} />
      <Slider id="riskPct" label="Risk per trade" value={f.riskPct} min={0.25} max={2} step={0.25} fmt={(v) => `${v}%`} hint={`If a trade hits its stop you lose about ${sym}${exampleRisk.toLocaleString()} on a ${sym}${per.toLocaleString()} account`} onChange={(v) => set('riskPct', v)} />
      <Slider id="maxPositionPct" label="Largest position" value={f.maxPositionPct} min={5} max={25} step={5} fmt={(v) => `${v}% of account`} onChange={(v) => set('maxPositionPct', v)} />
      <Slider id="maxPositions" label="Trades at once" value={f.maxPositions} min={1} max={10} step={1} fmt={(v) => String(v)} onChange={(v) => set('maxPositions', v)} />
      <Slider id="dailyLossPct" label="Daily loss limit" value={f.dailyLossPct} min={1} max={10} step={1} fmt={(v) => `${v}%`} hint="Pause new orders for a day after this drop" onChange={(v) => set('dailyLossPct', v)} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.withTrendOnly} onChange={(e) => set('withTrendOnly', e.target.checked)} style={{ width: 18, minHeight: 18 }} /> Only trade with the weekly trend <span className="dim">(recommended)</span></label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.allowShort} onChange={(e) => set('allowShort', e.target.checked)} style={{ width: 18, minHeight: 18 }} /> Allow short trades <span className="dim">(betting on a fall; higher risk)</span></label>
      {ownerBroker && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }} className="inset">
          <input type="checkbox" checked={f.broker === 'alpaca'} onChange={(e) => set('broker', e.target.checked ? 'alpaca' : 'paper')} style={{ width: 18, minHeight: 18, marginTop: 3 }} />
          <span>Owner only: also send orders to my connected Alpaca account as bracket orders (entry, stop, target). <span className="dim">Uses the account set by ALPACA_TRADING_URL.</span></span>
        </label>
      )}
      {!existing && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ width: 18, minHeight: 18, marginTop: 3 }} />
          <span className="muted">I understand these are simulated practice trades for learning, signals are often wrong, and this is not investment advice.</span>
        </label>
      )}
      <button className="btn btn-gold" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Saving…' : existing ? 'Update rules' : 'Start auto-trading on paper'}</button>
      {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
    </form>
  );
}

function Slider({ id, label, value, min, max, step, fmt, hint, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; hint?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><label htmlFor={id}>{label}</label><span className="mono gold">{fmt(value)}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
      {hint && <div className="dim" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

export function GrowControls({ active }: { active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  async function toggle() {
    setBusy(true);
    await fetch('/api/strategy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: !active }) }).catch(() => null);
    setBusy(false); router.refresh();
  }
  async function reset() {
    setBusy(true);
    await fetch('/api/strategy', { method: 'DELETE' }).catch(() => null);
    setBusy(false); setConfirmReset(false); router.refresh();
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className={`tag ${active ? 'green' : 'gold'}`}>{active ? '● Auto-trading on' : '❚❚ Paused'}</span>
      <button type="button" className="btn btn-line" disabled={busy} onClick={toggle}>{active ? 'Pause' : 'Resume'}</button>
      {confirmReset ? (
        <>
          <span className="muted" style={{ fontSize: 13 }}>Delete all trades and start over?</span>
          <button type="button" className="btn" style={{ background: 'var(--red)', color: '#0B1B33' }} disabled={busy} onClick={reset}>Yes, reset</button>
          <button type="button" className="btn btn-line" onClick={() => setConfirmReset(false)}>Cancel</button>
        </>
      ) : <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line2)' }} onClick={() => setConfirmReset(true)}>Reset account</button>}
    </div>
  );
}
