import { describe, expect, it } from 'vitest';
import { TEAM, agent, tagOf } from '@/lib/agents/team';
import { DOMAINS } from '@/lib/agents/domains';

describe('agent team', () => {
  it('has unique agent names', () => {
    expect(new Set(TEAM.map((a) => a.name)).size).toBe(TEAM.length);
    expect(tagOf('quant')).toBe('Quant · Screener');
    expect(agent('sigma').role).toBe('Risk meter');
    expect(tagOf('pulse')).toBe('Pulse · Market sentiment');
    expect(agent('pulse').href).toBe('/sentiment');
    expect(tagOf('epoch')).toBe('Epoch · Money history');
  });
  it('names every domain agent from the team', () => {
    const names = new Set(TEAM.map((a) => a.name));
    Object.values(DOMAINS).forEach((d) => expect(names.has(d.label)).toBe(true));
    expect(DOMAINS.markets.tools).toContain('get_sentiment');
  });
});
