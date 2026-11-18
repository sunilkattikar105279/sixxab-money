import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { Reel } from '@/components/Reel';
import { videos } from '@/lib/media';
import { getPivot } from '@/lib/data/regime';
import { PivotLadder } from '@/components/PivotLadder';

export const metadata: Metadata = { title: 'Pivot · Levels' };
export const revalidate = 600;

export default async function Levels() {
  const [[latest], board] = await Promise.all([videos({ topic: 'daily-brief', limit: 1 }), getPivot()]);
  return (
    <>
      <Header active="Levels" />
      <main className="wrap" id="main">
        <section className="bar">
          <span className="tag gold">Pivot · Levels{board ? ` · as of ${board.asOf} close` : ''}</span>
          <span style={{ flex: '1 1 480px' }}>Every night after the US close, Pivot reads each index on four timeframes: weekly trend, daily break levels, 4-hour and 1-hour supply/demand zones, Wyckoff phase and Elliott count. Each card shows two if/then scenarios. Educational outlook, not a recommendation. Levels can fail.</span>
        </section>
        {board?.reads.length ? (
          <div className="pivot-grid">{board.reads.map((r) => <PivotLadder key={r.symbol} r={r} />)}</div>
        ) : (
          <section className="card"><p className="muted" style={{ margin: 0 }}>Pivot’s first nightly read appears here after tonight’s US close.</p></section>
        )}
        <section className="card" aria-label="How to read this">
          <h2>How to read a Pivot card</h2>
          <div className="grid" style={{ marginTop: 10 }}>
            <div className="inset"><b style={{ color: '#FF5C7A' }}>Red band</b>: supply, where sellers stepped in before. A 1-hour close above it opens the bullish scenario.</div>
            <div className="inset"><b style={{ color: '#2EE59D' }}>Green band</b>: demand, where buyers stepped in before. A 1-hour close below it opens the bearish scenario.</div>
            <div className="inset"><b style={{ color: '#D4A84B' }}>Dashed lines</b>: daily break levels, the last daily swing high and low. They are the next stops in each scenario.</div>
          </div>
        </section>
        <section className="card"><h2>Nifty 50 and India</h2><p className="muted" style={{ margin: 0 }}>India levels are held until SIXXAB Money is a SEBI-registered research analyst. Tape still covers the India close every day in the daily brief.</p></section>
        {latest && <section className="card"><h2 style={{ marginBottom: 10 }}>Latest brief with levels</h2><Reel url={latest.url} title={latest.title} /></section>}
        <Footer note="US index ETFs only · educational scenarios, not a recommendation" />
      </main>
    </>
  );
}
