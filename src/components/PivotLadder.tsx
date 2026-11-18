import type { PivotRead } from '@/lib/pivot';

const TREND = { UP: ['▲', '#2EE59D'], DOWN: ['▼', '#FF5C7A'], RANGE: ['◆', '#9FB0C4'] } as const;
const f = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** One index on a vertical price ladder: daily break lines, supply/demand bands, price, and the two 1-hour triggers. */
export function PivotLadder({ r }: { r: PivotRead }) {
  const vals = [r.price, r.daily.up, r.daily.down, r.supply?.high, r.supply?.low, r.demand?.high, r.demand?.low, ...r.elliott.targets.slice(0, 1)].filter((v): v is number => typeof v === 'number');
  const hi = Math.max(...vals), lo = Math.min(...vals), pad = (hi - lo) * 0.12 || r.price * 0.01;
  const top = hi + pad, bot = lo - pad, H = 300, Y = (v: number) => 14 + ((top - v) / (top - bot)) * (H - 28);
  const biasColor = r.bias === 'up' ? '#2EE59D' : r.bias === 'down' ? '#FF5C7A' : '#D4A84B';
  return (
    <article className="card pivot" aria-label={`${r.name} levels`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{r.name}</h2>
        <span className="mono" style={{ color: biasColor, fontWeight: 700, fontSize: 13 }}>{r.bias.toUpperCase()}</span>
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{f(r.price)} <span style={{ fontSize: 13, color: (r.changePct ?? 0) >= 0 ? '#2EE59D' : '#FF5C7A' }}>{r.changePct == null ? '' : `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%`}</span></div>
      <div className="trend-chips">
        {(['w', 'd', 'h4', 'h1'] as const).map((k) => { const t = r.trends[k]; if (!t) return null; const [g, c] = TREND[t]; return <span key={k} style={{ borderColor: c, color: c }}>{{ w: 'Weekly', d: 'Daily', h4: '4H', h1: '1H' }[k]} {g}</span>; })}
      </div>
      <svg viewBox={`0 0 340 ${H}`} width="100%" role="img" aria-label={`Price ${f(r.price)} between demand ${f(r.demand?.low)} and supply ${f(r.supply?.high)}`}>
        {r.supply && <g><rect x="40" y={Y(r.supply.high)} width="200" height={Math.max(4, Y(r.supply.low) - Y(r.supply.high))} fill="rgba(255,92,122,.22)" stroke="#FF5C7A" strokeWidth="1" rx="3" /><text x="246" y={Y(r.supply.high) + 11} fill="#FF5C7A" fontSize="11">{r.supply.tf} supply {f(r.supply.low)}–{f(r.supply.high)}</text></g>}
        {r.demand && <g><rect x="40" y={Y(r.demand.high)} width="200" height={Math.max(4, Y(r.demand.low) - Y(r.demand.high))} fill="rgba(46,229,157,.2)" stroke="#2EE59D" strokeWidth="1" rx="3" /><text x="246" y={Y(r.demand.low) - 2} fill="#2EE59D" fontSize="11">{r.demand.tf} demand {f(r.demand.low)}–{f(r.demand.high)}</text></g>}
        {r.daily.up != null && <g><line x1="20" x2="240" y1={Y(r.daily.up)} y2={Y(r.daily.up)} stroke="#D4A84B" strokeDasharray="6 4" /><text x="246" y={Y(r.daily.up) + 4} fill="#D4A84B" fontSize="11">Daily break ↑ {f(r.daily.up)}</text></g>}
        {r.daily.down != null && <g><line x1="20" x2="240" y1={Y(r.daily.down)} y2={Y(r.daily.down)} stroke="#D4A84B" strokeDasharray="6 4" /><text x="246" y={Y(r.daily.down) + 4} fill="#D4A84B" fontSize="11">Daily break ↓ {f(r.daily.down)}</text></g>}
        <g><line x1="20" x2="240" y1={Y(r.price)} y2={Y(r.price)} stroke="#F4F7FB" strokeWidth="2" /><circle cx="140" cy={Y(r.price)} r="6" fill="#F4F7FB" /><text x="20" y={Y(r.price) - 6} fill="#F4F7FB" fontSize="11" fontWeight="700">Price {f(r.price)}</text></g>
        {r.scenarios.map((s) => <text key={s.side} x="14" y={Y(s.trigger) + (s.side === 'bull' ? -4 : 12)} fontSize="14" fill={s.side === 'bull' ? '#2EE59D' : '#FF5C7A'}>{s.side === 'bull' ? '⇡' : '⇣'}</text>)}
      </svg>
      <ul className="pivot-scen">
        {r.scenarios.map((s) => <li key={s.side} className={s.side}>{s.text}</li>)}
      </ul>
      <div className="muted" style={{ fontSize: 12, display: 'grid', gap: 4 }}>
        <div><b>Wyckoff</b> (weekly): {r.wyckoff.phase}, {r.wyckoff.confidence} confidence</div>
        {r.elliott.summary && <div><b>Elliott</b>: {r.elliott.summary}{r.elliott.invalidation != null ? ` · count fails below/above ${f(r.elliott.invalidation)}` : ''}</div>}
      </div>
    </article>
  );
}
