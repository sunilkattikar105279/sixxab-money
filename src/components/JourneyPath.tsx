import Link from 'next/link';
import { STAGES, HOLD_MONTHS, type Country } from '@/lib/sixs';
import { StageIcon } from './StageIcon';

/** Which agent coaches each stage, and the first question a member can ask it (self-coaching). */
export const STAGE_COACH: Record<number, { agent: string; role: string; ask: string; age: string }> = {
  1: { agent: 'Basis', role: 'Learning', ask: 'I am at Stage 1 Startup. What is one money habit I can start this week?', age: 'Ages 11+' },
  2: { agent: 'Mentor', role: 'Coach', ask: 'I am at Stage 2 Struggle. Help me build a simple budget and my first month of savings.', age: 'First income' },
  3: { agent: 'Mentor', role: 'Coach', ask: 'I am at Stage 3 Scale. How do I build a 6-month emergency fund and start investing monthly?', age: 'Building' },
  4: { agent: 'Moat', role: 'Business strength', ask: 'I am at Stage 4 Success. How do I keep a 20% savings rate and plan taxes and insurance?', age: 'Independence' },
  5: { agent: 'Macro', role: 'Economy', ask: 'I am at Stage 5 Significance. How do I protect wealth and write a giving plan?', age: 'Wealth' },
  6: { agent: 'Mentor', role: 'Coach', ask: 'I am at Stage 6 SIXXAB. What goes into an estate plan and a community fund?', age: 'Legacy' },
};

const money = (v: number, c: Country) => (c === 'IN' ? `₹${v.toLocaleString('en-IN')}` : `$${v.toLocaleString('en-US')}`);

export interface JourneyProgress { stage: number; country: Country; habitMonths: number; netWorth: number | null }

/**
 * The six SIXXAB stages as a climbing path: each stop shows its two gates (habit + net worth) and the agent that coaches it.
 * With `progress` (signed-in members), the current stage glows, gates show live status, and "Ask my coach" opens the agent.
 */
export function JourneyPath({ progress, country = 'US' }: { progress?: JourneyProgress | null; country?: Country }) {
  const c = progress?.country ?? country;
  const cur = progress?.stage ?? 0;
  // stops climb left to right; y rises with each stage
  const X = (i: number) => 100 + i * 200, Y = (i: number) => 196 - i * 30; // node i sits over box column i
  return (
    <section className="card journey" aria-label="The SIXXAB journey">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <h2>The SIXXAB journey</h2>
        <span className="dim" style={{ fontSize: 13 }}>Six stages from age 11 to legacy · two gates per stage · an agent coach at every step</span>
      </div>

      <div className="journey-scroll">
      <div className="journey-map" role="img" aria-label="Path climbing through six stages from Startup to SIXXAB">
        <svg viewBox="0 0 1200 250" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id="jp-path" x1="0" x2="1"><stop offset="0" stopColor="#2EE59D" /><stop offset="1" stopColor="#D4A84B" /></linearGradient>
          </defs>
          {/* mountain silhouette */}
          <path d="M0 250 L200 170 L360 200 L560 110 L720 140 L940 40 L1200 100 L1200 250 Z" fill="rgba(212,168,75,.06)" />
          {/* the path */}
          <path d={STAGES.map((_, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(i)}`).join(' ')} fill="none" stroke="url(#jp-path)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
          {STAGES.map((s, i) => {
            const done = cur > s.n, now = cur === s.n;
            return (
              <g key={s.key} transform={`translate(${X(i)} ${Y(i)})`}>
                {now && <circle r="34" fill="rgba(212,168,75,.18)"><animate attributeName="r" values="28;38;28" dur="2.4s" repeatCount="indefinite" /></circle>}
                <circle r="24" fill={done ? '#2EE59D' : now ? '#D4A84B' : '#0F2342'} stroke={done ? '#2EE59D' : '#D4A84B'} strokeWidth="2.5" />
                <text y="6" textAnchor="middle" fontSize="18" fontWeight="800" fill={done || now ? '#08131F' : '#D4A84B'}>{done ? '✓' : s.n}</text>
                {/* gate flags */}
                <g transform="translate(30 -30)"><path d="M0 0v26M0 0h16l-4 5 4 5H0" stroke="#2EE59D" strokeWidth="2" fill="rgba(46,229,157,.25)" /></g>
                <text y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="#F4F7FB">{s.n}. {s.name}</text>
                <text y="64" textAnchor="middle" fontSize="12" fill="#9FB0C4">{STAGE_COACH[s.n].age}</text>
              </g>
            );
          })}
          <text x={X(0)} y={Y(0) - 36} textAnchor="middle" fontSize="12" fill="#2EE59D">Start here</text>
        </svg>
      </div>

      <ol className="journey-stops">
        {STAGES.map((s) => {
          const coach = STAGE_COACH[s.n], now = cur === s.n, done = cur > s.n;
          const nwGate = s.netWorthGate ? s.netWorthGate[c] : null;
          const nwMet = now && progress?.netWorth != null && nwGate != null && progress.netWorth >= nwGate;
          const habitMet = now && (progress?.habitMonths ?? 0) >= HOLD_MONTHS;
          return (
            <li key={s.key} className={now ? 'now' : done ? 'done' : ''}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StageIcon n={s.n} size={30} /><div><div className="tag gold">Stage {s.n} · {coach.age}</div><div className="journey-name">{s.n}. {s.name}{done ? ' ✓' : ''}</div></div></div>
              <p className="muted" style={{ fontSize: 12, margin: '6px 0' }}>{s.focus}</p>
              <div className="gate"><span className={`gate-dot ${habitMet ? 'ok' : ''}`} />Habit gate: {s.habitGate}{now ? ` (${Math.min(progress?.habitMonths ?? 0, HOLD_MONTHS)}/${HOLD_MONTHS} months)` : ''}</div>
              <div className="gate"><span className={`gate-dot ${nwMet ? 'ok' : ''}`} />{nwGate == null ? 'Top stage: legacy, no net-worth gate' : `Net-worth gate: ${money(nwGate, c)}${now && progress?.netWorth != null ? ` (you: ${money(Math.round(progress.netWorth), c)})` : ''}`}</div>
              <Link className="coach" href={`/ask?q=${encodeURIComponent(coach.ask)}`}>{now ? 'Ask my coach' : 'Coach'}: {coach.agent} · {coach.role} →</Link>
            </li>
          );
        })}
      </ol>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13 }}>Move up when both gates hold for {HOLD_MONTHS} monthly check-ins in a row. Your coach checks in each month.</span>
        <Link href={progress ? '/my-money/journey' : '/journey'} className="btn btn-line" style={{ marginLeft: 'auto' }}>{progress ? 'Open my journey' : 'Take the 2-minute stage quiz'}</Link>
      </div>
    </section>
  );
}
