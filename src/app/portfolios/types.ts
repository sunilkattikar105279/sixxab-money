export interface PortfolioEntry {
  id: string; name: string; tagline: string; style: string; risk: 'Low' | 'Medium' | 'High'; agent: string; method: string[]; backtest: boolean;
  result?: {
    curve: { d: string; v: number; bench: number }[]; totalReturnPct: number; cagrPct: number; maxDrawdownPct: number; volPct: number; bestYearPct: number | null; worstYearPct: number | null;
    benchTotalReturnPct: number; benchCagrPct: number; benchMaxDrawdownPct: number; yearly: { year: string; pct: number; bench: number }[];
    holdings: { symbol: string; weight: number }[]; changes: { added: string[]; removed: string[] }; turnoverPct: number; rebalancedOn: string;
  };
  live?: { since: string; holdings: { symbol: string; weight: number }[] };
}
export interface PortfolioFile { generated: string | null; benchmark: string; costPctPerSide: number; universeSize: number; note: string; portfolios: PortfolioEntry[] }
