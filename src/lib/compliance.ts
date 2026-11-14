import type { Market } from './data/market';

/**
 * Entry/stop/target levels on Indian stocks are research recommendations under SEBI rules and need a registered
 * research analyst. Until SIXXAB_SEBI_RA=true, India shows scores and technical reads only.
 * SIXXAB_PERSONAL_MODE=true unlocks levels for a private, single-user install (your own laptop).
 */
export function levelsAllowed(market: Market): boolean {
  if (process.env.SIXXAB_PERSONAL_MODE === 'true') return true;
  if (market === 'IN') return process.env.SIXXAB_SEBI_RA === 'true';
  return true;
}
