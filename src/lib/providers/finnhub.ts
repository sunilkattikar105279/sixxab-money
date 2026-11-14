// Finnhub company news (US). Free plan: 60 calls/min, personal use.
export async function finnhubHeadlines(symbol: string, days = 7): Promise<string[]> {
  const key = process.env.FINNHUB_API_KEY; if (!key) return [];
  const to = new Date(), from = new Date(Date.now() - days * 86_400_000);
  const u = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&token=${key}`;
  const res = await fetch(u, { cache: 'no-store' }); if (!res.ok) return [];
  return ((await res.json()) as { headline: string }[]).slice(0, 40).map((n) => n.headline);
}
