import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import { normalizeMoney } from '@/lib/money';
import { MoneyEditor } from '@/components/MoneyEditor';

export const metadata: Metadata = { title: 'Manage money' };

export default async function Manage() {
  const m = (await getMember())!;
  const me = m.member!;
  const { data } = await m.sb.from('member_money').select('data, updated_at').eq('member_id', me.id).maybeSingle();
  return (
    <main className="wrap" id="main">
      <section className="bar">
        <span className="tag teal">Manage money</span>
        <span style={{ flex: '1 1 420px' }}>Your monthly budget, emergency fund, debts and net worth in one place. Numbers stay private to you{me.adult ? '' : ' and are not shown to your parent'}.</span>
        {data?.updated_at && <span className="dim" style={{ fontSize: 12 }}>Last saved {data.updated_at.slice(0, 10)}</span>}
      </section>
      <MoneyEditor initial={normalizeMoney(data?.data)} country={me.country} adult={me.adult} />
    </main>
  );
}
