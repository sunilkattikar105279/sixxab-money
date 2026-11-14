import { describe, expect, it } from 'vitest';
import { guard, DISCLAIMER, indiaPriceAllowedInEducation } from '@/lib/agents/guardrail';

const adult = { isMinor: false, country: 'US' as const, adviceRegistered: false };
describe('guardrail', () => {
  it('blocks personalised buy/sell calls when not registered', () => {
    const r = guard('You should buy Nvidia now.', adult);
    expect(r.ok).toBe(false);
    expect(r.flags).toContain('personalised_advice');
    expect(r.text).toContain('SEC');
  });
  it('names SEBI for Indian members', () => {
    expect(guard('Strong buy on this stock.', { ...adult, country: 'IN' }).text).toContain('SEBI');
  });
  it('blocks partisan endorsements', () => {
    expect(guard('You should vote for the candidate who cuts taxes.', adult).flags).toContain('partisan');
  });
  it('blocks trading topics for minors', () => {
    expect(guard('Here is how options trading works for beginners.', { ...adult, isMinor: true }).flags).toContain('minor_unsafe_topic');
  });
  it('adds the disclaimer to safe answers', () => {
    const r = guard('An index fund holds many companies at once.', adult);
    expect(r.ok).toBe(true);
    expect(r.text.endsWith(DISCLAIMER)).toBe(true);
  });
  it('applies the SEBI 30-day price lag for India education', () => {
    const now = new Date('2026-11-13T00:00:00Z');
    expect(indiaPriceAllowedInEducation(new Date('2026-11-01T00:00:00Z'), now)).toBe(false);
    expect(indiaPriceAllowedInEducation(new Date('2026-10-01T00:00:00Z'), now)).toBe(true);
  });
});
