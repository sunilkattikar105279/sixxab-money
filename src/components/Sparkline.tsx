/** Tiny equity curve. Green when the last value is at or above the first. */
export function Sparkline({ points, height = 48, label = 'Equity curve' }: { points: number[]; height?: number; label?: string }) {
  if (points.length < 2) return <p className="dim" style={{ margin: 0, fontSize: 12 }}>The curve appears after the first nightly run.</p>;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const w = 300;
  const xy = points.map((p, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${(height - 4 - ((p - min) / span) * (height - 8)).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label={`${label}: from ${points[0].toFixed(0)} to ${points[points.length - 1].toFixed(0)}`} preserveAspectRatio="none">
      <polyline points={xy} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
