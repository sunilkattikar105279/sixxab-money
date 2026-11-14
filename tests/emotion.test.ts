import { describe, expect, it } from 'vitest';
import { detectSignals, plan } from '@/lib/emotion';

describe('money emotions', () => {
  it('slows down panic selling with a 24h cooling-off', () => {
    const s = detectSignals('The market is crashing, I want to sell everything');
    expect(s).toContain('panic');
    expect(plan(s)).toMatchObject({ tone: 'slow_down', coolingOffHours: 24, escalate: false });
  });
  it('slows down FOMO', () => {
    expect(plan(detectSignals('should I go all in on this coin, I can’t miss it')).tone).toBe('slow_down');
  });
  it('reassures shame and low mood', () => {
    expect(plan(detectSignals('I am so stupid with money')).tone).toBe('reassure');
    expect(plan([], 2).tone).toBe('reassure');
  });
  it('routes distress to human support', () => {
    const p = plan(detectSignals('I feel hopeless, there is no way out of this debt'));
    expect(p.escalate).toBe(true);
    expect(p.tone).toBe('support');
  });
  it('stays steady by default', () => {
    expect(plan(detectSignals('What is an index fund?')).tone).toBe('steady');
  });
});
