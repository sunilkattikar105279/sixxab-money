import { describe, expect, it } from 'vitest';
import { bestRoute, isQuestion, search } from '@/lib/search';

describe('header search', () => {
  it('sends a ticker straight to its stock page', () => {
    expect(bestRoute('NVDA')).toBe('/stock/US/NVDA');
    expect(bestRoute('nvda')).toBe('/stock/US/NVDA');
    expect(bestRoute('$AAPL')).toBe('/stock/US/AAPL');
    expect(bestRoute('INFY — Infosys')).toBe('/stock/IN/INFY');
  });
  it('finds companies by name', () => {
    expect(search('infosys').some((h) => h.href === '/stock/IN/INFY')).toBe(true);
    expect(bestRoute('google')).toMatch(/\/stock\/US\/GOOGL?$/);
  });
  it('routes policy and economy topics', () => {
    expect(bestRoute('tariffs')).toBe('/world?t=Trade%20%26%20tariffs');
    expect(bestRoute('Fed rate cut')).toBe('/world?t=Central%20banks');
    expect(search('india inflation').some((h) => h.href === '/economy?c=IN')).toBe(true);
  });
  it('leaves real questions to the agent', () => {
    expect(isQuestion('Why did NVDA fall today?')).toBe(true);
    expect(bestRoute('Why did NVDA fall today?')).toBeNull();
  });
});
