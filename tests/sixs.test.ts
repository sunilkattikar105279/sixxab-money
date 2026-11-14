import { describe, expect, it } from 'vitest';
import { canPromote, stageOf, ageOn, isMinor, netWorthProgress } from '@/lib/sixs';

const scale = stageOf(3);
describe('6S gates', () => {
  it('promotes after 3 consecutive months with both gates met', () => {
    expect(canPromote(scale, [
      { month: '2026-08', habitGateMet: true, netWorth: 10_500 },
      { month: '2026-09', habitGateMet: true, netWorth: 11_000 },
      { month: '2026-10', habitGateMet: true, netWorth: 12_000 },
    ], 'US')).toBe(true);
  });
  it('does not promote with a gap month', () => {
    expect(canPromote(scale, [
      { month: '2026-07', habitGateMet: true, netWorth: 10_500 },
      { month: '2026-09', habitGateMet: true, netWorth: 11_000 },
      { month: '2026-10', habitGateMet: true, netWorth: 12_000 },
    ], 'US')).toBe(false);
  });
  it('does not promote when the habit gate slips once', () => {
    expect(canPromote(scale, [
      { month: '2026-08', habitGateMet: true, netWorth: 10_500 },
      { month: '2026-09', habitGateMet: false, netWorth: 11_000 },
      { month: '2026-10', habitGateMet: true, netWorth: 12_000 },
    ], 'US')).toBe(false);
  });
  it('uses India gates for Indian members', () => {
    const checks = ['2026-08', '2026-09', '2026-10'].map((month) => ({ month, habitGateMet: true, netWorth: 260_000 }));
    expect(canPromote(scale, checks, 'IN')).toBe(true);
    expect(canPromote(scale, checks, 'US')).toBe(true);
    expect(canPromote(scale, checks.map((c) => ({ ...c, netWorth: 200_000 })), 'IN')).toBe(false);
  });
  it('never promotes past SIXXAB', () => {
    expect(canPromote(stageOf(6), [], 'US')).toBe(false);
    expect(netWorthProgress(stageOf(6), 0, 'US')).toBe(1);
  });
  it('computes age and minors', () => {
    expect(ageOn('2012-07-15', new Date('2026-11-13T00:00:00Z'))).toBe(14);
    expect(isMinor('2012-07-15', new Date('2026-11-13T00:00:00Z'))).toBe(true);
    expect(isMinor('1990-01-01', new Date('2026-11-13T00:00:00Z'))).toBe(false);
  });
});
