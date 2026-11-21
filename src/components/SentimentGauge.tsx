import Link from 'next/link';
import type { SentimentRead, Mood } from '@/lib/sentiment';

export const MOOD_COL: Record<Mood, string> = { 'extreme fear': '#FF5C7A', fear: '#F59E5B', neutral: '#C9B26B', greed: '#7ED957', 'extreme greed': '#2EE59D' };

/** Half-circle dial, 0 (extreme fear) on the left to 100 (extreme greed) on the right. */
export function Dial({ score, size = 220, label }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 14, cx = size / 2, cy = size / 2 + 4;
  const pt = (v: number, rr = r) => { const a = Math.PI * (1 - v / 100); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
  const arc = (a: number, b: number) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`; };
  const bands: [number, number, Mood][] = [[0, 25, 'extreme fear'], [25, 45, 'fear'], [45, 55, 'neutral'], [55, 75, 'greed'], [75, 100, 'extreme greed']];
  const [nx, ny] = pt(score, r - 18);
  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 34}`} width="100%" style={{ maxWidth: size }} role="img" aria-label={`${label ?? 'SIXXAB Sentiment'} ${score} of 100`}>
      {bands.map(([a, b, m]) => <path key={m} d={arc(a + 0.6, b - 0.6)} stroke={MOOD_COL[m]} strokeWidth={14} fill="none" strokeLinecap="butt" opacity={0.9} />)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#fff" />
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={26} fontWeight={800} fill="#fff">{score}</text>
    </svg>
  );
}

/** Home-page card: the composite dial plus the three regions. */
export function SentimentCard({ s }: { s: SentimentRead | null }) {
  if (!s) return null;
  return (
    <section className="card sentiment-card" aria-label="SIXXAB Sentiment">
      <div className="tag gold">SIXXAB Sentiment · {s.asOf}</div>
      <div className="sentiment-row">
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <Dial score={s.score} size={200} />
          <div style={{ color: MOOD_COL[s.mood], fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{s.mood}</div>
        </div>
        <div className="sentiment-regions">
          {s.regions.map((r) => (
            <div key={r.region} className="inset">
              <div className="muted" style={{ fontSize: 12 }}>{r.name}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{r.score}<span style={{ fontSize: 13, marginLeft: 8, color: MOOD_COL[r.mood], fontWeight: 700 }}>{r.mood}</span></div>
              <div className="dim" style={{ fontSize: 12 }}>{r.phase[0] ? `${r.phase[0].index}: ${r.phase[0].phase}` : ''}</div>
            </div>
          ))}
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{s.flows.notes[0] ?? ''} <Link href="/sentiment">See what drives it →</Link></p>
        </div>
      </div>
    </section>
  );
}
