// Sector rotation: where each sector sits against the index (relative strength level and momentum, the idea behind
// relative rotation graphs), plus each sector's own Wyckoff phase and Elliott position, compared with the sectors that
// usually lead in the index's current cycle phase. Tendencies from past cycles, never a rule.
import { resample, type Bar } from './ta/bars';
import { wyckoff, type Phase } from './ta/wyckoff';
import { elliott } from './ta/elliott';

export type Quadrant = 'leading' | 'weakening' | 'lagging' | 'improving';
export type CyclePhase = 'early recovery' | 'expansion' | 'late cycle' | 'slowdown' | 'contraction';

export interface SectorDef { key: string; name: string; symbol: string }
export interface SectorRead {
  key: string; name: string; symbol: string;
  level: number;      // 13-week return minus the index's, in % points
  momentum: number;   // 4-week return minus the index's, in % points
  quadrant: Quadrant;
  phase: Phase;
  wave: string | null;
  expected: boolean;  // a usual leader in the index's current phase
  agreement: number;  // 0-10
  why: string;
}
export interface RotationRead { market: 'US' | 'IN'; asOf: string; indexPhase: CyclePhase; indexWyckoff: Phase; indexWave: string | null; sectors: SectorRead[]; summary: string }

export const US_SECTORS: SectorDef[] = [
  { key: 'tech', name: 'Technology', symbol: 'XLK' }, { key: 'fin', name: 'Financials', symbol: 'XLF' },
  { key: 'energy', name: 'Energy', symbol: 'XLE' }, { key: 'health', name: 'Health Care', symbol: 'XLV' },
  { key: 'ind', name: 'Industrials', symbol: 'XLI' }, { key: 'disc', name: 'Consumer Discretionary', symbol: 'XLY' },
  { key: 'staples', name: 'Consumer Staples', symbol: 'XLP' }, { key: 'util', name: 'Utilities', symbol: 'XLU' },
  { key: 'mat', name: 'Materials', symbol: 'XLB' }, { key: 're', name: 'Real Estate', symbol: 'XLRE' },
  { key: 'comm', name: 'Communication Services', symbol: 'XLC' },
];
export const IN_SECTORS: SectorDef[] = [
  { key: 'bank', name: 'Nifty Bank', symbol: 'NSE_INDEX|Nifty Bank' }, { key: 'it', name: 'Nifty IT', symbol: 'NSE_INDEX|Nifty IT' },
  { key: 'auto', name: 'Nifty Auto', symbol: 'NSE_INDEX|Nifty Auto' }, { key: 'pharma', name: 'Nifty Pharma', symbol: 'NSE_INDEX|Nifty Pharma' },
  { key: 'fmcg', name: 'Nifty FMCG', symbol: 'NSE_INDEX|Nifty FMCG' }, { key: 'metal', name: 'Nifty Metal', symbol: 'NSE_INDEX|Nifty Metal' },
  { key: 'energy', name: 'Nifty Energy', symbol: 'NSE_INDEX|Nifty Energy' }, { key: 'realty', name: 'Nifty Realty', symbol: 'NSE_INDEX|Nifty Realty' },
  { key: 'psubank', name: 'Nifty PSU Bank', symbol: 'NSE_INDEX|Nifty PSU Bank' }, { key: 'media', name: 'Nifty Media', symbol: 'NSE_INDEX|Nifty Media' },
];

/** Sectors that have tended to lead in each phase (US keys and India keys). */
export const LEADERS: Record<CyclePhase, string[]> = {
  'early recovery': ['fin', 'disc', 're', 'bank', 'auto', 'realty'],
  expansion: ['tech', 'ind', 'comm', 'it', 'psubank', 'media'],
  'late cycle': ['energy', 'mat', 'metal'],
  slowdown: ['health', 'staples', 'util', 'pharma', 'fmcg'],
  contraction: ['staples', 'util', 'health', 'fmcg', 'pharma'],
};

/** Index cycle phase from its weekly Wyckoff phase and Elliott position. */
export function cyclePhase(w: Phase, wave: string | null): CyclePhase {
  if (w === 'markdown' || wave === 'C') return 'contraction';
  if (w === 'distribution' || wave === 'A' || wave === 'B') return 'slowdown';
  if (w === 'accumulation' || wave === '1' || wave === '2') return 'early recovery';
  if (wave === '5') return 'late cycle';
  return 'expansion';
}

const ret = (bars: Bar[], n: number) => { const a = bars.at(-1 - n)?.c, b = bars.at(-1)?.c; return a && b ? ((b - a) / a) * 100 : 0; };
const r1 = (x: number) => Math.round(x * 10) / 10;

export function quadrantOf(level: number, momentum: number): Quadrant {
  return level >= 0 ? (momentum >= 0 ? 'leading' : 'weakening') : momentum >= 0 ? 'improving' : 'lagging';
}

export function readRotation(market: 'US' | 'IN', index: Bar[], sectors: { def: SectorDef; bars: Bar[] }[]): RotationRead | null {
  if (index.length < 120) return null;
  const iw = resample(index, '1w');
  const indexWyckoff = wyckoff(iw).phase;
  const indexWave = elliott(index).wave;
  const indexPhase = cyclePhase(indexWyckoff, indexWave);
  const leaders = new Set(LEADERS[indexPhase]);
  const i13 = ret(index, 63), i4 = ret(index, 20);
  const out: SectorRead[] = [];
  for (const { def, bars } of sectors) {
    if (bars.length < 120) continue;
    const level = r1(ret(bars, 63) - i13), momentum = r1(ret(bars, 20) - i4);
    const quadrant = quadrantOf(level, momentum);
    const phase = wyckoff(resample(bars, '1w')).phase;
    const wave = elliott(bars).wave;
    const expected = leaders.has(def.key);
    let agreement = { leading: 7, improving: 6, weakening: 4, lagging: 2 }[quadrant];
    if (phase === 'markup' || phase === 'accumulation') agreement += 1;
    if (phase === 'markdown' || phase === 'distribution') agreement -= 1;
    if (expected && (quadrant === 'leading' || quadrant === 'improving')) agreement += 2;
    if (expected && quadrant === 'lagging') agreement -= 1;
    agreement = Math.max(0, Math.min(10, agreement));
    const why = `${quadrant === 'leading' ? 'Beating the index and still gaining' : quadrant === 'improving' ? 'Behind the index but gaining fast' : quadrant === 'weakening' ? 'Ahead of the index but losing pace' : 'Behind the index and losing pace'}; weekly ${phase}${wave ? `, Elliott wave ${wave}` : ''}${expected ? `; a usual leader in ${indexPhase}` : ''}.`;
    out.push({ key: def.key, name: def.name, symbol: def.symbol, level, momentum, quadrant, phase, wave, expected, agreement, why });
  }
  if (!out.length) return null;
  out.sort((a, b) => b.agreement - a.agreement || b.momentum - a.momentum);
  const lead = out.filter((s) => s.quadrant === 'leading').map((s) => s.name), imp = out.filter((s) => s.quadrant === 'improving').map((s) => s.name);
  const summary = `Index cycle: ${indexPhase} (weekly ${indexWyckoff}${indexWave ? `, wave ${indexWave}` : ''}). Leading: ${lead.join(', ') || 'none'}. Improving: ${imp.join(', ') || 'none'}.`;
  return { market, asOf: new Date(index.at(-1)!.t).toISOString().slice(0, 10), indexPhase, indexWyckoff, indexWave, sectors: out, summary };
}
