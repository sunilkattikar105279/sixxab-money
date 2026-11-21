import { describe, expect, it } from 'vitest';
import { placeStage, weekOf, TRACKS } from '@/lib/curriculum';
import { resolve, stats } from '@/lib/scorecard';
import { cyclePhase, quadrantOf, readRotation, US_SECTORS } from '@/lib/rotation';
import { welcomeEmail } from '@/lib/email';

describe('stages and curriculum', () => {
  it('has 12 lessons for each of the 6 stages', () => {
    expect(TRACKS).toHaveLength(6);
    TRACKS.forEach((t) => expect(t.lessons).toHaveLength(12));
  });
  it('places members by the quiz, teens always at Startup', () => {
    expect(placeStage({ income: 'regular', savings: 'sixPlus', investing: 'monthly20' }, 15)).toBe(1);
    expect(placeStage({ income: 'none', savings: 'none', investing: 'no' }, 30)).toBe(1);
    expect(placeStage({ income: 'regular', savings: 'under1', investing: 'no' }, 25)).toBe(2);
    expect(placeStage({ income: 'regular', savings: 'oneToSix', investing: 'monthly20' }, 30)).toBe(3);
    expect(placeStage({ income: 'regular', savings: 'sixPlus', investing: 'givesBack' }, 45)).toBe(4);
  });
  it('counts the week of the track from the join date', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    expect(weekOf('2026-11-16T00:00:00Z', now)).toBe(1);
    expect(weekOf('2026-11-01T00:00:00Z', now)).toBe(3);
    expect(weekOf('2026-08-01T00:00:00Z', now)).toBeLessThanOrEqual(12);
  });
  it('writes the day-0 welcome email with the stage and first lesson', () => {
    const e = welcomeEmail('welcome_d0', { id: '0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Asha Rao', stage: 3, referralCode: 'abc123', foundingNumber: 7 });
    expect(e.subject).toMatch(/Stage 3/);
    expect(e.html).toMatch(/founding member #7/);
    expect(e.html).toMatch(/Emergency fund/);
    expect(e.html).toMatch(/api\/unsubscribe\?u=0f8fad5b-d9cb-469f-a165-70867728950e&t=[0-9a-f]{32}/);
  });
});

describe('scenario scorecard', () => {
  const t = { side: 'long' as const, entry: 100, stop: 95, target: 110, as_of: '2026-11-01' };
  it('resolves targets, stops and expiry on daily closes', () => {
    expect(resolve(t, 111, '2026-11-05')).toMatchObject({ outcome: 'target', r: 2.2 });
    expect(resolve(t, 94, '2026-11-05')).toMatchObject({ outcome: 'stop', r: -1.2 });
    expect(resolve(t, 102, '2026-11-05').outcome).toBe('open');
    expect(resolve(t, 102, '2026-12-05').outcome).toBe('expired');
    expect(resolve({ ...t, side: 'short', stop: 105, target: 90 }, 89, '2026-11-05').outcome).toBe('target');
  });
  it('summarises the hit rate', () => {
    const s = stats([{ outcome: 'target', r_multiple: 2 }, { outcome: 'stop', r_multiple: -1 }, { outcome: 'open', r_multiple: null }]);
    expect(s).toMatchObject({ resolved: 2, hits: 1, hitRate: 50, avgR: 0.5, open: 1 });
  });
});

describe('sector rotation', () => {
  it('maps quadrants and cycle phases', () => {
    expect(quadrantOf(3, 1)).toBe('leading');
    expect(quadrantOf(3, -1)).toBe('weakening');
    expect(quadrantOf(-3, 1)).toBe('improving');
    expect(quadrantOf(-3, -1)).toBe('lagging');
    expect(cyclePhase('markup', '3')).toBe('expansion');
    expect(cyclePhase('markup', '5')).toBe('late cycle');
    expect(cyclePhase('distribution', null)).toBe('slowdown');
    expect(cyclePhase('accumulation', null)).toBe('early recovery');
    expect(cyclePhase('markdown', null)).toBe('contraction');
  });
  it('ranks a sector that beats the index as leading', () => {
    const mk = (g: number) => Array.from({ length: 600 }, (_, i) => { const c = 100 * Math.pow(1 + g, i); return { t: Date.UTC(2024, 0, 1) + i * 864e5, o: c, h: c * 1.005, l: c * 0.995, c, v: 1e6 }; });
    const r = readRotation('US', mk(0.0005), [{ def: US_SECTORS[0], bars: mk(0.001) }, { def: US_SECTORS[1], bars: mk(0.0001) }])!;
    expect(r.sectors.find((s) => s.key === 'tech')!.quadrant).toBe('leading');
    expect(r.sectors.find((s) => s.key === 'fin')!.level).toBeLessThan(0);
  });
});
