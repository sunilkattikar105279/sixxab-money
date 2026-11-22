'use client';

import { useEffect, useMemo, useState } from 'react';
import { buyMix, drift, needsRebalance, valueOf, type MarketModels, type ModelKey, type PaperPortfolio } from '@/lib/models';

const KEY = 'sixxab_paper_v1';
const today = () => new Date().toISOString().slice(0, 10);
const load = (): PaperPortfolio[] => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const save = (p: PaperPortfolio[]) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off */ } };

export function PaperDesk({ set, prices, asOf, initialModel }: { set: MarketModels; prices: Record<string, number>; asOf: string | null; initialModel?: ModelKey }) {
  const money = useMemo(() => new Intl.NumberFormat(set.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: set.currency, maximumFractionDigits: 0 }), [set.currency]);
  const label = (k: string) => set.assets.find((a) => a.key === k)?.label ?? k;
  const priced = set.assets.every((a) => prices[a.key] > 0);

  const [all, setAll] = useState<PaperPortfolio[]>([]);
  const [loaded, setLoaded] = useState(false);
  const startModel = set.models.find((m) => m.key === initialModel) ?? set.models[2];
  const [base, setBase] = useState<string>(startModel.key);
  const [weights, setWeights] = useState<Record<string, number>>({ ...startModel.weights });
  const [amount, setAmount] = useState(set.currency === 'INR' ? 1_000_000 : 100_000);
  const [name, setName] = useState(`${startModel.name} practice`);
  const [addAmt, setAddAmt] = useState<Record<string, number>>({});

  useEffect(() => { setAll(load()); setLoaded(true); }, []);
  const mine = all.filter((p) => p.market === set.market);
  const total = set.assets.reduce((s, a) => s + (weights[a.key] || 0), 0);
  const commit = (next: PaperPortfolio[]) => { setAll(next); save(next); };

  function pickModel(k: string) {
    setBase(k);
    const m = set.models.find((x) => x.key === k);
    if (m) { setWeights({ ...m.weights }); setName(`${m.name} practice`); } else setName('My own mix');
  }
  function create() {
    if (!priced || total !== 100 || amount <= 0) return;
    const target = Object.fromEntries(Object.entries(weights).filter(([, w]) => w > 0));
    const p: PaperPortfolio = { id: `${Date.now()}`, name: name.trim() || 'Practice portfolio', market: set.market, created: today(), invested: amount, target, holdings: buyMix(target, amount, prices), events: [{ d: today(), what: `Started with ${money.format(amount)}`, value: amount }] };
    commit([p, ...all]);
  }
  const update = (id: string, f: (p: PaperPortfolio) => PaperPortfolio) => commit(all.map((p) => (p.id === id ? f(p) : p)));
  const rebalance = (p: PaperPortfolio) => update(p.id, (x) => { const v = valueOf(x.holdings, prices); return { ...x, holdings: buyMix(x.target, v, prices), events: [{ d: today(), what: 'Rebalanced to targets', value: v }, ...x.events] }; });
  const add = (p: PaperPortfolio) => {
    const a = addAmt[p.id] || 0; if (a <= 0) return;
    update(p.id, (x) => { const extra = buyMix(x.target, a, prices); const holdings = x.holdings.map((h) => ({ ...h })); extra.forEach((e) => { const h = holdings.find((y) => y.key === e.key); if (h) h.units += e.units; else holdings.push(e); }); return { ...x, invested: x.invested + a, holdings, events: [{ d: today(), what: `Added ${money.format(a)} into the target mix`, value: valueOf(holdings, prices) }, ...x.events] }; });
    setAddAmt({ ...addAmt, [p.id]: 0 });
  };
  const remove = (p: PaperPortfolio) => { if (confirm(`Delete "${p.name}"? This only removes it from this browser.`)) commit(all.filter((x) => x.id !== p.id)); };

  return (
    <>
      <section className="card" aria-label="Start a paper portfolio">
        <div className="tag teal">Start a paper portfolio · {set.label}</div>
        <h1 style={{ margin: '6px 0 6px', fontSize: 26 }}>Practise with pretend money at real prices</h1>
        <p className="muted" style={{ margin: '0 0 12px' }}>Pick a model or build your own mix, choose a pretend amount, and it is bought at the latest closing prices{asOf ? ` (${asOf})` : ''}. Come back to see how it moves, add money, and practise rebalancing. Saved only in this browser.</p>
        {!priced ? <p className="muted">Prices are not available right now, so new paper portfolios can’t be started. Please try again later.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row-edit">
              <label>Start from<br />
                <select value={base} onChange={(e) => pickModel(e.target.value)}>
                  {set.models.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
                  <option value="custom">My own mix</option>
                </select>
              </label>
              <label>Name<br /><input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} /></label>
              <label>Pretend amount ({set.currency})<br /><input type="number" min={1} step={1000} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} /></label>
            </div>
            <div className="budget-rows">
              {set.assets.map((a) => (
                <label key={a.key} className="budget-row">
                  <span><span aria-hidden style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: a.color, marginRight: 6 }} />{a.label}: <b className="mono">{weights[a.key] || 0}%</b></span>
                  <input type="range" min={0} max={100} step={5} value={weights[a.key] || 0} onChange={(e) => { setWeights({ ...weights, [a.key]: Number(e.target.value) }); setBase('custom'); setName((n) => (n.endsWith(' practice') ? 'My own mix' : n)); }} />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={create} disabled={total !== 100}>Start paper portfolio</button>
              <span className={total === 100 ? 'muted' : 'red'}>Mix adds up to {total}%{total !== 100 ? ' — it needs to be 100%' : ''}</span>
            </div>
          </div>
        )}
      </section>

      {loaded && mine.length === 0 && <section className="card"><p className="muted" style={{ margin: 0 }}>No paper portfolios for {set.label} yet. Start one above, or open <a href={`/practice/models?m=${set.market}`}>the model portfolios</a> to compare the mixes first.</p></section>}

      {mine.map((p) => {
        const v = priced ? valueOf(p.holdings, prices) : 0;
        const gain = v - p.invested;
        const d = priced ? drift(p, prices) : [];
        const off = needsRebalance(d);
        return (
          <section key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="hub-head" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{p.name}</h2>
              <span className="dim" style={{ fontSize: 13 }}>Started {p.created}</span>
            </div>
            {priced && (
              <div className="hub-stats">
                <div className="inset"><div className="dim" style={{ fontSize: 12 }}>Value now</div><div className="big">{money.format(v)}</div></div>
                <div className="inset"><div className="dim" style={{ fontSize: 12 }}>Put in (pretend)</div><div className="big">{money.format(p.invested)}</div></div>
                <div className="inset"><div className="dim" style={{ fontSize: 12 }}>Change</div><div className="big" style={{ color: gain >= 0 ? 'var(--green)' : 'var(--red)' }}>{gain >= 0 ? '+' : ''}{money.format(gain)} ({p.invested ? (100 * gain / p.invested).toFixed(1) : '0'}%)</div></div>
              </div>
            )}
            {priced && (
              <div className="scroll">
                <table className="compact">
                  <thead><tr><th>Asset</th><th>Target</th><th>Now</th><th>Off by</th></tr></thead>
                  <tbody>{d.map((x) => <tr key={x.key}><td>{label(x.key)}</td><td className="mono">{x.target.toFixed(0)}%</td><td className="mono">{x.now.toFixed(1)}%</td><td className="mono" style={{ color: Math.abs(x.gap) >= 5 ? 'var(--gold)' : undefined }}>{x.gap >= 0 ? '+' : ''}{x.gap.toFixed(1)} pts</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {priced && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{off ? 'At least one asset has drifted 5 or more points from its target. A common rule is to rebalance now: sell some of what rose, buy what fell.' : 'Every asset is within 5 points of its target. A common rule is to leave it alone until that changes.'}</p>}
            {priced && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <button className={off ? 'btn btn-gold' : 'btn btn-line'} onClick={() => rebalance(p)}>Rebalance on paper</button>
                <label className="sr" htmlFor={`add-${p.id}`}>Amount to add</label>
                <input id={`add-${p.id}`} type="number" min={0} step={1000} placeholder={`Add ${set.currency}`} value={addAmt[p.id] || ''} onChange={(e) => setAddAmt({ ...addAmt, [p.id]: Math.max(0, Number(e.target.value)) })} style={{ width: 140 }} />
                <button className="btn btn-line" onClick={() => add(p)}>Add pretend money</button>
                <button className="link-btn" onClick={() => remove(p)}>Delete</button>
              </div>
            )}
            <details><summary className="dim" style={{ cursor: 'pointer' }}>History ({p.events.length})</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>{p.events.map((e, i) => <li key={i}>{e.d}: {e.what} · value {money.format(e.value)}</li>)}</ul>
            </details>
          </section>
        );
      })}
    </>
  );
}
