import { describe, expect, it } from 'vitest';
import { GOALS, STARTER_PLANS } from '../src/lib/growth';
import { checkLimits } from '../src/lib/ratelimit';

describe('founding-member onboarding', () => {
  it('has a 3-step starter plan for every goal', () => {
    for (const g of GOALS) {
      expect(STARTER_PLANS[g.id]).toHaveLength(3);
      expect(STARTER_PLANS[g.id].every((s) => !s.done && s.goal && s.how)).toBe(true);
    }
  });
});

describe('rate limits (memory fallback without Supabase)', () => {
  it('allows up to the limit, then blocks', async () => {
    const rule = [{ name: `t-${Date.now()}`, limit: 3, windowSeconds: 60 }];
    expect(await checkLimits('visitor', rule)).toBeNull();
    expect(await checkLimits('visitor', rule)).toBeNull();
    expect(await checkLimits('visitor', rule)).toBeNull();
    expect(await checkLimits('visitor', rule)).toBe('minute');
    expect(await checkLimits('someone-else', rule)).toBeNull();
  });

  it('reports daily limits as daily', async () => {
    const rule = [{ name: `d-${Date.now()}`, limit: 1, windowSeconds: 86_400 }];
    await checkLimits('v', rule);
    expect(await checkLimits('v', rule)).toBe('daily');
  });
});
