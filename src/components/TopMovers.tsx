import type { StockBoard } from '@/lib/data/stocks';

const f = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`;

export function TopMovers({ board }: { board: StockBoard }) {
  const known = board.rows.filter((r) => r.changePct !== null).sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  if (known.length < 2) return null;
  const up = known.filter((r) => (r.changePct ?? 0) > 0).slice(0, 4), down = known.filter((r) => (r.changePct ?? 0) < 0).slice(-4).reverse();
  const list = (rows: typeof known, cls: string) => rows.map((r) => <div key={r.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--line)' }}><span className="mono" style={{ color: '#fff', fontWeight: 600 }}>{r.symbol}</span><span className={`mono ${cls}`}>{f(r.changePct!)}</span></div>);
  return (
    <section className="card" aria-label="Top movers">
      <h2 style={{ marginBottom: 8 }}>Top movers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div><div className="tag green">Gainers</div>{list(up, 'green')}</div>
        <div><div className="tag red">Losers</div>{list(down, 'red')}</div>
      </div>
    </section>
  );
}
