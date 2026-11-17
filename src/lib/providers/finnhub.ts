import type { Events, InsiderTx } from '../events';
import { summarizeInsider } from '../events';

// Finnhub company news (US). Free plan: 60 calls/min, personal use.
export async function finnhubHeadlines(symbol: string, days = 7): Promise<string[]> {
  const key = process.env.FINNHUB_API_KEY; if (!key) return [];
  const to = new Date(), from = new Date(Date.now() - days * 86_400_000);
  const u = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&token=${key}`;
  const res = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(20_000) }); if (!res.ok) return [];
  return ((await res.json()) as { headline: string }[]).slice(0, 40).map((n) => n.headline);
}

async function fh<T>(path: string): Promise<T | null> {
  const key = process.env.FINNHUB_API_KEY; if (!key) return null;
  const res = await fetch(`https://finnhub.io/api/v1/${path}${path.includes('?') ? '&' : '?'}token=${key}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) { if (res.status !== 403) console.warn(`Finnhub ${path.split('?')[0]}: HTTP ${res.status}`); return null; }
  return (await res.json()) as T;
}

/** Next earnings date, the last four earnings surprises, and 90 days of insider open-market trades (US). */
export async function finnhubEvents(symbol: string): Promise<Events | null> {
  if (!process.env.FINNHUB_API_KEY) return null;
  const s = encodeURIComponent(symbol.replace('.', '-'));
  const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const [cal, surp, ins] = await Promise.all([
    fh<{ earningsCalendar?: { date: string; hour: string }[] }>(`calendar/earnings?symbol=${s}&from=${day(0)}&to=${day(90)}`),
    fh<{ period: string; actual: number | null; estimate: number | null; surprisePercent: number | null }[]>(`stock/earnings?symbol=${s}`),
    fh<{ data?: { name: string; change: number; transactionPrice: number | null; transactionCode: string; transactionDate: string }[] }>(`stock/insider-transactions?symbol=${s}&from=${day(-90)}&to=${day(0)}`),
  ]);
  if (!cal && !surp && !ins) return null;
  const next = (cal?.earningsCalendar ?? []).map((e) => e).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const txs: InsiderTx[] = (ins?.data ?? []).map((t) => ({ name: t.name, change: t.change, price: t.transactionPrice, code: t.transactionCode, date: t.transactionDate }));
  return {
    nextEarnings: next?.date ?? null, earningsHour: next?.hour || null,
    surprises: (surp ?? []).slice(0, 4).map((x) => ({ period: x.period, actual: x.actual, estimate: x.estimate, surprisePct: x.surprisePercent })),
    insider: ins ? summarizeInsider(txs) : null,
    asOf: day(0),
  };
}
