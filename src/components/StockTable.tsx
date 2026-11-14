import type { StockBoard } from '@/lib/data/stocks';

const fmtPct = (p: number | null) => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`);

export function StockTable({ board, currency }: { board: StockBoard; currency: 'USD' | 'INR' | 'local' }) {
  const rows = [...board.rows].sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
  const money = (v: number | null) => v === null ? '—' : currency === 'local' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  return (
    <section className="card" aria-label="Stocks">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h2>Stocks</h2><span className="dim" style={{ fontSize: 12 }}>Sorted by 1-day change</span>
      </div>
      <div className="scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
        <table className="compact">
          <thead><tr><th>Ticker</th><th>Company</th><th>Industry</th><th style={{ textAlign: 'right' }}>Last</th><th style={{ textAlign: 'right' }}>Change</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td className="mono" style={{ color: '#fff', fontWeight: 600 }}>{r.symbol}</td>
                <td>{r.name}</td>
                <td className="muted">{r.sector}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{money(r.price)}</td>
                <td className={`mono ${r.changePct === null ? 'dim' : r.changePct >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right', fontWeight: 600 }}>{fmtPct(r.changePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
