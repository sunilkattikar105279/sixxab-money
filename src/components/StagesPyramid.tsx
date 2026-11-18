import { STAGES } from '@/lib/sixs';
import { STAGE_COACH } from './JourneyPath';

/** The six SIXXAB stages as a pyramid (top = legacy), with each tier's focus and gate in full beside it. */
export function StagesPyramid({ highlight }: { highlight?: number }) {
  const tiers = [...STAGES].reverse();
  return (
    <div className="pyramid" role="list" aria-label="SIXXAB Journey pyramid: Startup at the base from age 11, up to SIXXAB legacy at the top">
      {tiers.map((s, i) => {
        const w = 34 + i * 13; // % width: narrow at the top, wide at the base
        return (
          <div key={s.key} role="listitem" className={`tier${highlight === s.n ? ' on' : ''}`}>
            <div className="tier-shape-wrap"><div className="tier-shape" style={{ width: `${w}%` }}><b>{s.n}. {s.name}</b><span>{STAGE_COACH[s.n].age}</span></div></div>
            <div className="tier-text"><div className="tier-focus">{s.focus}</div><div className="tier-gate">Gate: {s.habitGate}</div></div>
          </div>
        );
      })}
      <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Move up when the habit gate and the net-worth gate hold for 3 monthly check-ins in a row. Ages are a guide, not a rule.</p>
    </div>
  );
}
