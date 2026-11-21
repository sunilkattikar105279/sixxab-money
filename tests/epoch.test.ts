import { describe, it, expect } from 'vitest';
import { GDP_SHARE, restOf, EMPIRES, AVG_REIGN } from '../src/lib/epoch';

describe('Epoch data', () => {
  it('keeps every year of shares at or under 100%', () => {
    for (const r of GDP_SHARE) expect(restOf(r)).toBeGreaterThanOrEqual(0);
  });
  it('computes the average reign of past reserve currencies', () => {
    expect(EMPIRES.filter((e) => !e.to)).toHaveLength(1);
    expect(AVG_REIGN).toBe(94);
  });
});
