'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { avalanche, budgetView, emergencyView, netWorth, type Asset, type Debt, type MoneyData } from '@/lib/money';

const KINDS: Asset['kind'][] = ['cash', 'savings', 'investments', 'retirement', 'property', 'other'];

export function MoneyEditor({ initial, country, adult }: { initial: MoneyData; country: 'US' | 'IN'; adult: boolean }) {
  const [d, setD] = useState<MoneyData>(initial);
  const [extra, setExtra] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fmt = (v: number) => new Intl.NumberFormat(country === 'IN' ? 'en-IN' : 'en-US', { style: 'currency', currency: country === 'IN' ? 'INR' : 'USD', maximumFractionDigits: 0 }).format(v);
  const cur = country === 'IN' ? '₹' : '$';
  const bv = useMemo(() => budgetView(d), [d]);
  const ev = useMemo(() => emergencyView(d), [d]);
  const nw = useMemo(() => netWorth(d), [d]);
  const plan = useMemo(() => avalanche(d.debts, extra), [d.debts, extra]);

  const up = (fn: (x: MoneyData) => MoneyData) => { setD((x) => fn(structuredClone(x))); setDirty(true); setMsg(null); };
  const n = (v: string) => Math.max(0, Number(v.replace(/[^0-9.]/g, '')) || 0);

  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/money', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg('Could not save. Try again.');
    setDirty(false); setMsg('Saved.');
  }

  return (
    <>
      <section className="grid" aria-label="Summary">
        <Stat label="Net worth" value={fmt(nw.netWorth)} tone={nw.netWorth >= 0 ? 'green' : 'red'} note={`${fmt(nw.assets)} owned · ${fmt(nw.debts)} owed`} />
        <Stat label="Savings rate" value={`${bv.savingsRatePct.toFixed(0)}%`} tone={bv.savingsRatePct >= 20 ? 'green' : bv.savingsRatePct >= 10 ? 'gold' : 'red'} note="Save + invest as % of income · aim for 20%" />
        <Stat label="Emergency fund" value={`${ev.months.toFixed(1)} months`} tone={ev.months >= d.emergency.monthsGoal ? 'green' : ev.months >= 1 ? 'gold' : 'red'} note={`Goal ${d.emergency.monthsGoal} months of needs`} />
        <Stat label="Debt-free in" value={!d.debts.length ? 'No debts' : plan.feasible ? `${plan.months} months` : 'Raise payments'} tone={!d.debts.length ? 'green' : plan.feasible ? 'gold' : 'red'} note={d.debts.length ? `Interest to pay: ${fmt(plan.interest)}` : 'Keep it that way'} />
      </section>

      <div className="savebar" role="region" aria-label="Save">
        <span className="muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        <button className="btn btn-gold" type="button" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save my numbers'}</button>
        {msg && <span role="status" className={msg === 'Saved.' ? 'teal' : 'red'}>{msg}</span>}
        <Link href="/my-money/journey#checkin" style={{ marginLeft: 'auto' }}>Use this net worth in my monthly check-in →</Link>
      </div>

      <div className="cols">
        <div className="main">
          <section className="card" aria-labelledby="budget-title">
            <h2 id="budget-title">1. Monthly budget</h2>
            <p className="muted" style={{ margin: '4px 0 12px' }}>Enter a typical month. The target split is a common starting point (needs 50%, wants 25%, save 15%, invest 10%).</p>
            <Field id="income" label={`Take-home income per month (${cur})`} value={d.budget.income} onChange={(v) => up((x) => { x.budget.income = n(v); return x; })} />
            <div className="budget-rows">
              {bv.rows.map((r, i) => (
                <div key={r.key} className="inset budget-row">
                  <Field id={r.key} label={`${r.label} (${cur})`} hint={['rent, food, bills, transport', 'eating out, fun, shopping', 'emergency fund, goals', adult ? 'index funds, retirement' : 'savings for later'][i]} value={r.actual} onChange={(v) => up((x) => { x.budget[r.key] = n(v); return x; })} />
                  <div style={{ fontSize: 12 }} className="muted">Target {r.targetPct}% = {fmt(r.target)} · <span className={r.good ? 'teal' : 'gold'}>{r.good ? 'on track' : r.key === 'needs' || r.key === 'wants' ? `${fmt(r.actual - r.target)} over` : `${fmt(r.target - r.actual)} short`}</span></div>
                  <div className="prog" aria-hidden="true"><div style={{ width: `${r.target > 0 ? Math.min(100, (r.actual / r.target) * 100) : 0}%`, background: r.good ? 'var(--teal)' : 'var(--gold)' }} /></div>
                </div>
              ))}
            </div>
            <p className={bv.left < 0 ? 'red' : 'muted'} style={{ margin: '10px 0 0' }}>{bv.income === 0 ? 'Add your income to see the split.' : bv.left < 0 ? `You plan to use ${fmt(-bv.left)} more than you earn. Trim wants first.` : bv.left > 0 ? `${fmt(bv.left)} is not assigned yet. Give every ${cur === '$' ? 'dollar' : 'rupee'} a job.` : 'Every unit of income has a job.'}</p>
          </section>

          <section className="card" aria-labelledby="debt-title">
            <h2 id="debt-title">3. Debts and payoff plan</h2>
            <p className="muted" style={{ margin: '4px 0 12px' }}>The avalanche method: pay minimums on all, put every extra {cur === '$' ? 'dollar' : 'rupee'} on the highest interest rate first. It costs the least interest.</p>
            {d.debts.map((x, i) => (
              <div key={`${i}-${d.debts.length}`} className="inset row-edit">
                <Field id={`dn${i}`} label="Name" text value={x.name} onChange={(v) => up((y) => { y.debts[i].name = v.slice(0, 60); return y; })} />
                <Field id={`db${i}`} label={`Balance (${cur})`} value={x.balance} onChange={(v) => up((y) => { y.debts[i].balance = n(v); return y; })} />
                <Field id={`dr${i}`} label="Interest % a year" value={x.ratePct} onChange={(v) => up((y) => { y.debts[i].ratePct = Math.min(100, n(v)); return y; })} />
                <Field id={`dm${i}`} label={`Minimum a month (${cur})`} value={x.minPayment} onChange={(v) => up((y) => { y.debts[i].minPayment = n(v); return y; })} />
                <button type="button" className="link-btn" onClick={() => up((y) => { y.debts.splice(i, 1); return y; })} aria-label={`Remove ${x.name}`}>Remove</button>
              </div>
            ))}
            {d.debts.length < 20 && <button type="button" className="btn btn-line" onClick={() => up((y) => { y.debts.push({ name: 'Credit card', balance: 0, ratePct: 0, minPayment: 0 } as Debt); return y; })}>+ Add a debt</button>}
            {d.debts.length > 0 && (
              <div className="inset" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Field id="extra" label={`Extra I can pay each month (${cur})`} value={extra} onChange={(v) => setExtra(n(v))} />
                {plan.feasible ? (
                  <>
                    <p style={{ margin: 0 }}>Debt-free in <b>{plan.months} months</b>, paying {fmt(plan.interest)} in interest. Pay them off in this order:</p>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>{plan.order.map((o) => <li key={o.name}>{o.name} <span className="dim">· cleared in month {o.month}</span></li>)}</ol>
                  </>
                ) : <p className="red" style={{ margin: 0 }}>At these payments the interest grows faster than you pay. Raise the minimums or the extra amount.</p>}
              </div>
            )}
          </section>
        </div>

        <aside className="side">
          <section className="card" aria-labelledby="ef-title">
            <h2 id="ef-title">2. Emergency fund</h2>
            <p className="muted" style={{ margin: '4px 0 12px' }}>Cash for surprises, sized in months of your needs.</p>
            <Field id="efs" label={`Saved so far (${cur})`} value={d.emergency.saved} onChange={(v) => up((x) => { x.emergency.saved = n(v); return x; })} />
            <label htmlFor="efm" style={{ display: 'block', marginTop: 10 }}>Goal: {d.emergency.monthsGoal} months</label>
            <input id="efm" type="range" min={1} max={12} value={d.emergency.monthsGoal} onChange={(e) => up((x) => { x.emergency.monthsGoal = Number(e.target.value); return x; })} style={{ width: '100%' }} />
            <div className="prog" style={{ marginTop: 8 }}><div style={{ width: `${ev.pct * 100}%`, background: ev.pct >= 1 ? 'var(--teal)' : 'var(--gold)' }} /></div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{ev.monthly > 0 ? `${fmt(ev.saved)} of ${fmt(ev.goal)}${ev.goal > ev.saved && d.budget.save > 0 ? ` · about ${Math.ceil((ev.goal - ev.saved) / d.budget.save)} months at your current saving` : ''}` : 'Add your monthly needs in the budget first.'}</p>
          </section>

          <section className="card" aria-labelledby="assets-title">
            <h2 id="assets-title">4. What you own</h2>
            <p className="muted" style={{ margin: '4px 0 12px' }}>Bank, investments, retirement, property. The emergency fund is counted automatically.</p>
            {d.assets.map((a, i) => (
              <div key={`${i}-${d.assets.length}`} className="inset row-edit">
                <Field id={`an${i}`} label="Name" text value={a.name} onChange={(v) => up((y) => { y.assets[i].name = v.slice(0, 60); return y; })} />
                <div>
                  <label htmlFor={`ak${i}`}>Type</label>
                  <select id={`ak${i}`} value={a.kind} onChange={(e) => up((y) => { y.assets[i].kind = e.target.value as Asset['kind']; return y; })}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                </div>
                <Field id={`av${i}`} label={`Value (${cur})`} value={a.value} onChange={(v) => up((y) => { y.assets[i].value = n(v); return y; })} />
                <button type="button" className="link-btn" onClick={() => up((y) => { y.assets.splice(i, 1); return y; })} aria-label={`Remove ${a.name}`}>Remove</button>
              </div>
            ))}
            {d.assets.length < 30 && <button type="button" className="btn btn-line" onClick={() => up((y) => { y.assets.push({ name: 'Savings account', value: 0, kind: 'savings' }); return y; })}>+ Add an account</button>}
            <p style={{ margin: '12px 0 0' }}>Net worth: <b className={nw.netWorth >= 0 ? 'green' : 'red'}>{fmt(nw.netWorth)}</b></p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'green' | 'gold' | 'red' }) {
  return <div className="card"><div className="tag dim">{label}</div><div className={`big ${tone}`}>{value}</div><div className="muted" style={{ fontSize: 12 }}>{note}</div></div>;
}

function Field({ id, label, value, onChange, hint, text }: { id: string; label: string; value: number | string; onChange: (v: string) => void; hint?: string; text?: boolean }) {
  // Keep the typed text locally so partial numbers like "7." are not rewritten while typing.
  const [raw, setRaw] = useState(text ? String(value) : value === 0 ? '' : String(value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
      <label htmlFor={id}>{label}{hint && <span className="dim"> · {hint}</span>}</label>
      <input id={id} inputMode={text ? 'text' : 'decimal'} value={raw} placeholder={text ? '' : '0'} onChange={(e) => { const v = text ? e.target.value : e.target.value.replace(/[^0-9.]/g, ''); setRaw(v); onChange(v); }} />
    </div>
  );
}
