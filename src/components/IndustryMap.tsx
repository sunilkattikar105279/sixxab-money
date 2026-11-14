import { bySector, heatColor, type StockBoard } from '@/lib/data/stocks';
import { squarify } from '@/lib/treemap';

const W = 100, H = 34; // layout units; rendered as percentages of a 100:56 box
const fmt = (p: number | null) => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`);
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function Legend() {
  const steps: [string, number | null][] = [['−3%', -3.5], ['−1%', -1.5], ['0', -0.2], ['+0', 0.2], ['+1%', 1.5], ['+3%', 3.5]];
  return (
    <span aria-label="Colour scale" style={{ display: 'inline-flex', gap: 2, alignItems: 'center', font: '600 10px var(--mono)' }}>
      {steps.map(([label, v]) => <span key={label} style={{ background: heatColor(v), color: '#fff', padding: '2px 6px', borderRadius: 3 }}>{label}</span>)}
    </span>
  );
}

export function IndustryMap({ board, title }: { board: StockBoard; title: string }) {
  const sectors = bySector(board.rows);
  const placedSectors = squarify(sectors.map((s) => ({ item: s, weight: s.weight })), { x: 0, y: 0, w: W, h: H });

  return (
    <section className="card" aria-label={title}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <h2>{title}</h2>
        <Legend /><span className="dim" style={{ fontSize: 12 }}>{board.asOf || 'awaiting data'}{board.sample ? ' · sample' : ''}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, minHeight: 220 }}>
        {placedSectors.map((s) => {
          const head = Math.min(2.4, s.h * 0.22);
          const tiles = squarify(s.item.rows.map((r) => ({ item: r, weight: r.marketCap ?? 1 })), { x: 0, y: 0, w: s.w, h: s.h - head });
          return (
            <div key={s.item.sector} style={{ position: 'absolute', left: pct(s.x, W), top: pct(s.y, H), width: pct(s.w, W), height: pct(s.h, H), padding: 1.5, boxSizing: 'border-box' }}>
              <div style={{ position: 'relative', width: '100%', height: '100%', background: '#081425', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: pct(head, s.h), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '0 6px', font: '700 10px var(--mono)', letterSpacing: 0.5, textTransform: 'uppercase', color: '#E6EDF6', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span>{s.item.sector}</span><span className={s.item.avgChange === null ? 'dim' : s.item.avgChange >= 0 ? 'green' : 'red'}>{fmt(s.item.avgChange)}</span>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: pct(head, s.h) }}>
                  {tiles.map((t) => (
                    <div key={t.item.symbol} title={`${t.item.name}: ${fmt(t.item.changePct)}`} style={{ position: 'absolute', left: pct(t.x, s.w), top: pct(t.y, s.h - head), width: pct(t.w, s.w), height: pct(t.h, s.h - head), padding: 1, boxSizing: 'border-box' }}>
                      <div style={{ width: '100%', height: '100%', background: heatColor(t.item.changePct), borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#fff', textAlign: 'center' }}>
                        <span style={{ font: '700 clamp(9px, 0.85vw, 13px) var(--head)' }}>{t.item.symbol}</span>
                        <span style={{ font: '600 clamp(8px, 0.7vw, 11px) var(--mono)' }}>{fmt(t.item.changePct)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="dim" style={{ margin: '8px 0 0', fontSize: 11 }}>Tile size: {board.rows.every((r) => r.marketCap) ? 'market value' : 'equal'} · {board.source}</p>
    </section>
  );
}
