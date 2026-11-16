export const FOUNDING_SPOTS = 100;

export const GOALS = [
  { id: 'save', label: 'Build my emergency fund' },
  { id: 'debt', label: 'Get out of debt' },
  { id: 'invest', label: 'Start investing' },
  { id: 'markets', label: 'Understand the markets' },
  { id: 'family', label: 'Teach my kids about money' },
  { id: 'income', label: 'Grow my income or business' },
] as const;
export type GoalId = (typeof GOALS)[number]['id'];

/** Starter 90-day plan per goal, so a new member never lands on an empty page. */
export const STARTER_PLANS: Record<GoalId, { goal: string; how: string; done: boolean }[]> = {
  save: [
    { goal: 'Know your monthly costs', how: 'Add up rent, food, bills and transport for one month', done: false },
    { goal: 'Save your first month of costs', how: 'Move a fixed amount to savings on payday, automatically', done: false },
    { goal: 'Reach three months of costs', how: 'Keep it in a separate high-interest savings account', done: false },
  ],
  debt: [
    { goal: 'List every debt', how: 'Balance, interest rate and minimum payment for each', done: false },
    { goal: 'Pay the highest-interest debt first', how: 'Minimums on the rest, every extra rupee or dollar to the top one', done: false },
    { goal: 'Stop new card debt', how: 'Pay the card in full each month or switch to debit', done: false },
  ],
  invest: [
    { goal: 'Have a one-month safety cushion first', how: 'Investing money should not be needed for emergencies', done: false },
    { goal: 'Learn what an index fund is', how: 'Watch the Learn videos and ask the coach', done: false },
    { goal: 'Invest a fixed amount monthly for 3 months', how: 'Same date every month, regardless of the news', done: false },
  ],
  markets: [
    { goal: 'Read the daily brief for 2 weeks', how: 'Home page, every weekday morning', done: false },
    { goal: 'Learn trend, support and resistance', how: 'Levels and Learn pages, then ask the coach', done: false },
    { goal: 'Follow 3 companies on the screener', how: 'Check how their scores change over a month', done: false },
  ],
  family: [
    { goal: 'Link your child’s account', how: 'Members aged 11–17 join through a parent', done: false },
    { goal: 'Start a weekly money talk', how: '10 minutes on needs, wants and saving', done: false },
    { goal: 'Give your child a savings goal', how: 'Match part of what they save', done: false },
  ],
  income: [
    { goal: 'Write down every income source', how: 'Salary, side work, rent, interest', done: false },
    { goal: 'Pick one skill to grow your pay', how: 'Ask the coach what is in demand in your field', done: false },
    { goal: 'Save half of any raise', how: 'Raise your savings before your spending', done: false },
  ],
};
