import type { BreadthBar } from '@/lib/data/breadth';

export function Breadth({ bars }: { bars: BreadthBar[] }) {
  if (!bars.length) return null;
  return (
    <section className="grid" aria-label="Market breadth">
      {bars.map((b) => {
        const tot = b.left + b.right || 1, pl = Math.round((b.left / tot) * 100);
        return (
          <div key={b.title} className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, gap: 6 }}>
              <span className="green">{b.leftLabel} {pl}% ({b.left})</span><span className="red">{b.rightLabel} {100 - pl}% ({b.right})</span>
            </div>
            <div className="track" title={b.title}><div style={{ width: `${pl}%` }} /></div>
            <div className="dim" style={{ fontSize: 11 }}>{b.title}</div>
          </div>
        );
      })}
    </section>
  );
}
