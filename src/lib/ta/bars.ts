export interface Bar { t: number; o: number; h: number; l: number; c: number; v: number } // t = epoch ms (bar open)

export type TF = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M' | '1y';
export const TF_MINUTES: Record<TF, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080, '1M': 43200, '1y': 525600 };

/** Groups finer bars into a coarser timeframe. Calendar buckets for 1w (Monday), 1M and 1y; fixed buckets intraday. */
export function resample(bars: Bar[], tf: TF): Bar[] {
  const key = (t: number) => {
    const d = new Date(t);
    if (tf === '1y') return Date.UTC(d.getUTCFullYear(), 0, 1);
    if (tf === '1M') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    if (tf === '1w') { const day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); }
    if (tf === '1d') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const ms = TF_MINUTES[tf] * 60_000;
    return Math.floor(t / ms) * ms;
  };
  const out: Bar[] = [];
  for (const b of [...bars].sort((a, z) => a.t - z.t)) {
    const k = key(b.t);
    const last = out.at(-1);
    if (last && last.t === k) { last.h = Math.max(last.h, b.h); last.l = Math.min(last.l, b.l); last.c = b.c; last.v += b.v; }
    else out.push({ t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v });
  }
  return out;
}
