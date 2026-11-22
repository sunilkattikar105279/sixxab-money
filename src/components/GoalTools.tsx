'use client';

import { useEffect, useMemo, useState } from 'react';
import { LRS_LIMIT_USD, lrsHeadroom, monthlyNeeded, type ModelMarket } from '@/lib/models';

interface Goal { id: string; name: string; target: number; years: number; saved: number; ret: number; infl: number }
const KEY = 'sixxab_goals_v1';

export function GoalPlanner({ market }: { market: ModelMarket }) {
  const inr = market === 'IN';
  const money = useMemo(() => new Intl.NumberFormat(inr ? 'en-IN' : 'en-US', { style: 'currency', currency: inr ? 'INR' : 'USD', maximumFractionDigits: 0 }), [inr]);
  const blank: Goal = { id: '', name: 'Home down payment', target: inr ? 2_000_000 : 60_000, years: 7, saved: inr ? 300_000 : 10_000, ret: 6, infl: inr ? 5 : 3 };
  const [g, setG] = useState<Goal>(blank);
  const [goals, setGoals] = useState<Goal[]>([]);
  useEffect(() => { try { const s = localStorage.getItem(`${KEY}_${market}`); if (s) setGoals(JSON.parse(s)); } catch { /* ignore */ } }, [market]);
  const persist = (next: Goal[]) => { setGoals(next); try { localStorage.setItem(`${KEY}_${market}`, JSON.stringify(next)); } catch { /* ignore */ } };

  const scen = (r: number) => monthlyNeeded({ target: g.target, years: g.years, saved: g.saved, annualReturn: Math.max(0, r) / 100, inflation: g.infl / 100 });
  const rows = [{ label: 'Lower return', r: g.ret - 2 }, { label: 'Your assumption', r: g.ret }, { label: 'Higher return', r: g.ret + 2 }].map((x) => ({ ...x, r: Math.max(0, x.r), ...scen(x.r) }));
  const num = (k: 'target' | 'years' | 'saved' | 'ret' | 'infl') => (e: React.ChangeEvent<HTMLInputElement>) => setG({ ...g, [k]: Math.max(0, Number(e.target.value)) });

  return (
    <section className="card" aria-label="Goal planner">
      <div className="tag teal">Goal planner</div>
      <h2 style={{ margin: '6px 0 6px', fontSize: 22 }}>How much to set aside each month for a goal</h2>
      <p className="muted" style={{ margin: '0 0 12px' }}>Enter the goal in today’s money. The planner grows it by inflation, then shows the monthly saving needed under three return assumptions you choose. Nobody knows future returns, so plan on the lower one.</p>
      <div className="row-edit">
        <label>Goal<br /><input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value.slice(0, 60) })} /></label>
        <label>Cost today<br /><input type="number" min={0} value={g.target} onChange={num('target')} /></label>
        <label>Years away<br /><input type="number" min={1} max={60} value={g.years} onChange={num('years')} style={{ width: 90 }} /></label>
        <label>Already saved<br /><input type="number" min={0} value={g.saved} onChange={num('saved')} /></label>
        <label>Return you assume (%/yr)<br /><input type="number" min={0} max={15} step={0.5} value={g.ret} onChange={num('ret')} style={{ width: 110 }} /></label>
        <label>Inflation (%/yr)<br /><input type="number" min={0} max={15} step={0.5} value={g.infl} onChange={num('infl')} style={{ width: 110 }} /></label>
      </div>
      <p style={{ margin: '4px 0 8px' }}>In {g.years} years, {money.format(g.target)} of today’s money is about <b className="mono" style={{ color: '#fff' }}>{money.format(rows[1].futureTarget)}</b>.</p>
      <div className="scroll">
        <table className="compact">
          <thead><tr><th>Scenario</th><th>Return</th><th>What you’ve saved grows to</th><th>Monthly saving needed</th></tr></thead>
          <tbody>{rows.map((x) => <tr key={x.label}><td>{x.label}</td><td className="mono">{x.r.toFixed(1)}%</td><td className="mono">{money.format(x.fromSaved)}</td><td className="mono" style={{ color: 'var(--gold)' }}>{money.format(x.monthly)}</td></tr>)}</tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-line" onClick={() => persist([{ ...g, id: `${Date.now()}` }, ...goals].slice(0, 12))}>Save this goal</button>
      </div>
      {goals.length > 0 && (
        <div className="scroll" style={{ marginTop: 12 }}>
          <table className="compact">
            <thead><tr><th>Saved goals</th><th>Cost today</th><th>Years</th><th>Monthly at your lower return</th><th></th></tr></thead>
            <tbody>{goals.map((x) => (
              <tr key={x.id}>
                <td><button className="link-btn" style={{ color: 'var(--teal)', minHeight: 0 }} onClick={() => setG(x)}>{x.name}</button></td>
                <td className="mono">{money.format(x.target)}</td><td className="mono">{x.years}</td>
                <td className="mono">{money.format(monthlyNeeded({ target: x.target, years: x.years, saved: x.saved, annualReturn: Math.max(0, x.ret - 2) / 100, inflation: x.infl / 100 }).monthly)}</td>
                <td><button className="link-btn" style={{ minHeight: 0 }} onClick={() => persist(goals.filter((y) => y.id !== x.id))}>Remove</button></td>
              </tr>))}
            </tbody>
          </table>
          <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Saved in this browser only.</p>
        </div>
      )}
    </section>
  );
}

const QUESTIONS: { q: string; a: string[] }[] = [
  { q: 'Your investments drop 20% in three months. What would you most likely do?', a: ['Sell everything', 'Sell some', 'Do nothing', 'Buy a little more', 'Buy a lot more'] },
  { q: 'When will you need most of this money?', a: ['Within 1 year', '1–3 years', '3–5 years', '5–10 years', 'More than 10 years'] },
  { q: 'How steady is your income?', a: ['Very uncertain', 'Somewhat uncertain', 'Average', 'Steady', 'Very steady, with savings set aside'] },
  { q: 'How many months of expenses do you have in an emergency fund?', a: ['None', 'Under 1', '1–3', '3–6', 'More than 6'] },
  { q: 'Which matters more to you?', a: ['Never losing money', 'Mostly safety', 'A balance', 'Mostly growth', 'Maximum growth'] },
  { q: 'Have you held investments through a big market fall before?', a: ['Never invested', 'No falls yet', 'Yes, and I sold', 'Yes, and I held', 'Yes, and I bought more'] },
];

export function RiskQuiz({ market }: { market: ModelMarket }) {
  const [ans, setAns] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const done = ans.every((x) => x !== null);
  const score = ans.reduce<number>((s, x) => s + (x ?? 0) + 1, 0); // 6..30
  const band = score <= 13 ? { name: 'Low', read: 'Big swings would be hard on you right now, in feelings or in finances. Steadier mixes and a bigger cash cushion usually come first.' }
    : score <= 21 ? { name: 'Medium', read: 'You can likely sit through ordinary falls, but a deep one would test you. Look closely at the worst-fall numbers before choosing anything.' }
    : { name: 'High', read: 'You say you can ride out large falls and have time and a cushion. Check that past behaviour matches: what you did in a real fall matters more than what you expect to do.' };
  return (
    <section className="card" aria-label="Risk tolerance quiz">
      <div className="tag teal">Know your risk tolerance</div>
      <h2 style={{ margin: '6px 0 6px', fontSize: 22 }}>Six questions about how much movement you can live with</h2>
      <p className="muted" style={{ margin: '0 0 12px' }}>Risk has two sides: how you feel about losses (tolerance) and whether your life can absorb them (capacity: time, income, emergency fund). This quiz helps you think about both. It does not pick a portfolio for you.</p>
      <ol className="how">
        {QUESTIONS.map((x, i) => (
          <li key={x.q}>
            <div style={{ marginBottom: 6 }}>{x.q}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="radiogroup" aria-label={x.q}>
              {x.a.map((a, j) => <button key={a} role="radio" aria-checked={ans[i] === j} className="btn" style={{ minHeight: 36, padding: '0 12px', fontWeight: 600, background: ans[i] === j ? 'var(--teal)' : 'var(--panel2)', color: ans[i] === j ? '#0B1B33' : 'var(--muted)', border: '1px solid var(--line2)' }} onClick={() => setAns(ans.map((v, k) => (k === i ? j : v)))}>{a}</button>)}
            </div>
          </li>
        ))}
      </ol>
      {done && (
        <div className="inset" style={{ marginTop: 12, borderLeft: '3px solid var(--gold)' }}>
          <div className="tag gold">Your result · {score} of 30</div>
          <h3 style={{ margin: '4px 0' }}>{band.name} risk tolerance</h3>
          <p style={{ margin: '0 0 6px' }}>{band.read}</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Next: open the <a href={`/practice/models?m=${market}`}>model portfolios</a>, find the worst fall you could honestly sit through, and practise that mix on paper for a few months.</p>
        </div>
      )}
    </section>
  );
}

export function LrsTracker() {
  const [usd, setUsd] = useState(0);
  const left = lrsHeadroom(usd);
  return (
    <section className="card" aria-label="LRS headroom">
      <div className="tag teal">India · Investing abroad</div>
      <h2 style={{ margin: '6px 0 6px', fontSize: 22 }}>Your LRS headroom this financial year</h2>
      <p className="muted" style={{ margin: '0 0 12px' }}>Resident Indians can send up to USD {LRS_LIMIT_USD.toLocaleString('en-US')} abroad per person each financial year (April to March) under RBI’s Liberalised Remittance Scheme. Investments, travel, gifts and fees all share the same limit.</p>
      <label>Already sent abroad since 1 April (USD)<br /><input type="number" min={0} value={usd || ''} onChange={(e) => setUsd(Math.max(0, Number(e.target.value)))} /></label>
      <div style={{ marginTop: 12 }}>
        <div className="prog"><div style={{ width: `${Math.min(100, 100 * usd / LRS_LIMIT_USD)}%`, background: usd >= LRS_LIMIT_USD ? 'var(--red)' : 'var(--teal)' }} /></div>
        <p style={{ margin: '8px 0 0' }}>Left this year: <b className="mono" style={{ color: '#fff' }}>USD {left.toLocaleString('en-US')}</b></p>
      </div>
      <p className="dim" style={{ margin: '8px 0 0', fontSize: 13 }}>Tax collected at source (TCS) can apply once your remittances pass Rs 10 lakh in a year; it can be adjusted against your income tax. GIFT City funds also count towards LRS. Check the current rules with your bank or tax adviser.</p>
    </section>
  );
}
