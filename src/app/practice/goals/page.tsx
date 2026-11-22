import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { EducationBar, PracticeNav } from '@/components/Practice';
import { GoalPlanner, LrsTracker, RiskQuiz } from '@/components/GoalTools';
import { isModelMarket } from '@/lib/models';

export const metadata: Metadata = { title: 'Goals and risk', description: 'Plan how much to save for a goal, learn your risk tolerance, and track your LRS headroom. Education only.' };

export default async function Goals({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const market = isModelMarket(sp.m) ? sp.m : 'US';
  return (
    <>
      <Header active="Practice" />
      <main className="wrap" id="main">
        <EducationBar>Plan a goal with returns you choose, and think through how much risk you can live with.</EducationBar>
        <PracticeNav current="/practice/goals" market={market} />
        <GoalPlanner key={market} market={market} />
        <RiskQuiz market={market} />
        {market === 'IN' && <LrsTracker />}
      </main>
      <Footer note="Goals and risk · Education only" />
    </>
  );
}
