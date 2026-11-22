import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { EducationBar, PracticeNav } from '@/components/Practice';
import { PaperDesk } from '@/components/PaperDesk';
import { MODEL_SETS, isModelMarket, type ModelKey } from '@/lib/models';
import { modelHistory } from '@/lib/data/models';

export const metadata: Metadata = { title: 'Paper portfolio', description: 'Practise investing with pretend money at real end-of-day prices: build a mix, add money, rebalance. Education only.' };

const KEYS: ModelKey[] = ['preserve', 'conservative', 'balanced', 'growth', 'aggressive'];

export default async function Paper({ searchParams }: { searchParams: Promise<{ m?: string; model?: string }> }) {
  const sp = await searchParams;
  const market = isModelMarket(sp.m) ? sp.m : 'US';
  const h = await modelHistory(market);
  const model = KEYS.find((k) => k === sp.model);
  return (
    <>
      <Header active="Practice" />
      <main className="wrap" id="main">
        <EducationBar>Paper portfolios use pretend money and delayed end-of-day prices, so you can learn how a mix behaves before you ever risk real money.</EducationBar>
        <PracticeNav current="/practice/paper" market={market} />
        <PaperDesk key={`${market}-${model ?? ''}`} set={MODEL_SETS[market]} prices={h.prices} asOf={h.asOf} initialModel={model} />
        <section className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>What to practise</h2>
          <ul className="how">
            <li><b>Sit through a fall.</b> Check in when markets drop. Notice the urge to sell, and what happens if you wait.</li>
            <li><b>Rebalance on a rule, not a feeling.</b> Use the 5-point rule above and write down why you did or didn’t act.</li>
            <li><b>Add money regularly.</b> Monthly additions buy more units when prices are low, which is the habit that matters most over time.</li>
          </ul>
          <p className="dim" style={{ margin: '10px 0 0', fontSize: 12 }}>Paper results leave out taxes, fund fees, trading costs and the feelings of real money. Saved in this browser only; clearing site data removes it.</p>
        </section>
      </main>
      <Footer note="Paper portfolio · Pretend money, education only" />
    </>
  );
}
