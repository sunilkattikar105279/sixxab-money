import { STAGES } from '@/lib/sixs';
import { trackFor } from '@/lib/curriculum';

/** The six SIXXAB stages as a pyramid: wide base of basics from age 11, narrowing to legacy. */
export function StagesPyramid({ highlight }: { highlight?: number }) {
  const cx = 230, y0 = 20, th = 62, wTop = 90, wBase = 440;
  const wAt = (y: number) => wTop + (wBase - wTop) * (y - y0) / (6 * th);
  const tiers = [...STAGES].reverse(); // top = stage 6
  return (
    <svg viewBox="0 0 760 420" width="100%" role="img" aria-label="SIXXAB Stages pyramid: Startup at the base from age 11, up to SIXXAB legacy at the top">
      {tiers.map((s, i) => {
        const ya = y0 + th * i, yb = ya + th, a = wAt(ya) / 2, b = wAt(yb) / 2, cy = ya + th / 2, m = wAt(cy) / 2;
        const on = highlight === s.n;
        return (
          <g key={s.key}>
            <polygon points={`${cx - a},${ya} ${cx + a},${ya} ${cx + b},${yb} ${cx - b},${yb}`} fill={on ? 'var(--gold)' : 'var(--panel2, #12233d)'} fillOpacity={on ? 0.25 : 1} stroke={on ? 'var(--gold)' : 'var(--line2, #2a3c5a)'} strokeWidth={on ? 2.5 : 1.2} />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">{s.n} {s.name}</text>
            <text x={cx} y={cy + 15} textAnchor="middle" fontSize={11.5} fill="var(--muted, #9fb0c8)">{s.n === 6 ? '65+' : `typical age ${trackFor(s.n).ages}`}</text>
            <line x1={cx + m + 8} x2={478} y1={cy} y2={cy} stroke="var(--line2, #2a3c5a)" strokeDasharray="3 3" />
            <text x={486} y={cy - 3} fontSize={13} fill="#fff">{s.focus.length > 38 ? `${s.focus.slice(0, 36)}…` : s.focus}</text>
            <text x={486} y={cy + 14} fontSize={11} fill="var(--muted, #9fb0c8)">Gate: {s.habitGate.length > 44 ? `${s.habitGate.slice(0, 42)}…` : s.habitGate}</text>
          </g>
        );
      })}
      <text x={20} y={410} fontSize={11.5} fill="var(--muted, #9fb0c8)">Move up when the habit gate and the net-worth gate hold for 3 monthly check-ins in a row. Ages are a guide, not a rule.</text>
    </svg>
  );
}
