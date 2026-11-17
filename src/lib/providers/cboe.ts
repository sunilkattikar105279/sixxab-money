// CBOE publishes free daily VIX and VIX3M history as CSV (no key).
import { parseCboeCsv, type Point } from '../regime';

export async function cboeHistory(index: 'VIX' | 'VIX3M'): Promise<Point[]> {
  const res = await fetch(`https://cdn.cboe.com/api/global/us_indices/daily_prices/${index}_History.csv`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) { console.warn(`CBOE ${index}: HTTP ${res.status}`); return []; }
  return parseCboeCsv(await res.text());
}
