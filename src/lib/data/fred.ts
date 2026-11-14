// FRED (Federal Reserve Bank of St. Louis) — free API key at https://fred.stlouisfed.org/docs/api/api_key.html
export const INDICATORS: Record<string, { seriesId: string; label: string; units: string }> = {
  fed_funds: { seriesId: 'DFF', label: 'Fed funds rate', units: '%' },
  cpi: { seriesId: 'CPIAUCSL', label: 'CPI (index level)', units: 'index' },
  unemployment: { seriesId: 'UNRATE', label: 'Unemployment rate', units: '%' },
  ten_year: { seriesId: 'DGS10', label: '10-year Treasury yield', units: '%' },
  mortgage_30y: { seriesId: 'MORTGAGE30US', label: '30-year mortgage rate', units: '%' },
  gdp_growth: { seriesId: 'A191RL1Q225SBEA', label: 'Real GDP growth (annualised)', units: '%' },
  // India and global series that FRED carries
  usd_inr: { seriesId: 'DEXINUS', label: 'USD/INR', units: '₹ per $' },
  brent: { seriesId: 'DCOILBRENTEU', label: 'Brent crude', units: '$ per barrel' },
  dollar_index: { seriesId: 'DTWEXBGS', label: 'Broad US dollar index', units: 'index' },
};

export const GROUPS: Record<'US' | 'IN' | 'GLOBAL', string[]> = {
  US: ['fed_funds', 'cpi', 'unemployment', 'ten_year', 'mortgage_30y', 'gdp_growth'],
  IN: ['usd_inr'],
  GLOBAL: ['brent', 'dollar_index', 'usd_inr'],
};

export interface IndicatorValue { key: string; seriesId: string; label: string; units: string; value: number; date: string }

export async function getIndicator(key: string): Promise<IndicatorValue | null> {
  const meta = INDICATORS[key];
  const apiKey = process.env.FRED_API_KEY;
  if (!meta || !apiKey) return null;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${meta.seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  const obs = json.observations?.find((o) => o.value !== '.');
  if (!obs) return null;
  return { key, ...meta, value: Number(obs.value), date: obs.date };
}
