// SIXXAB Stages learning tracks: 12 weekly lessons per stage (understand, practise, prove), each with one real action
// that counts toward the stage's habit gate. Ages are typical, not rules: the gates decide promotion.

export interface Lesson { week: number; title: string; action: string }
export interface Track { stage: number; ages: string; phase: [string, string, string]; lessons: Lesson[] }

const L = (items: [string, string][]): Lesson[] => items.map(([title, action], i) => ({ week: i + 1, title, action }));
const PHASES: [string, string, string] = ['Understand (weeks 1–4)', 'Practise (weeks 5–8)', 'Prove (weeks 9–12)'];

export const TRACKS: Track[] = [
  { stage: 1, ages: '11–17', phase: PHASES, lessons: L([
    ['Earning vs spending', 'Write down every rupee or dollar you get this week'],
    ['Needs vs wants', 'Sort 10 things you bought into needs and wants'],
    ['What a bank does', 'Ask a parent to show you a bank statement'],
    ['Why saving works', 'Pick one thing to save for and its price'],
    ['Your pocket-money tracker', 'Track money in and out for 7 days'],
    ['The savings jar', 'Put 10% of anything you get into savings'],
    ['Prices and comparing', 'Compare the price of one item in 3 places'],
    ['Small business basics', 'List 3 ways you could earn (sell, tutor, create)'],
    ['Compound interest game', 'Use the calculator: ₹100 or $10 a month for 10 years'],
    ['Try a first earning idea', 'Do one paid task or sale'],
    ['Giving and sharing', 'Decide one small way to give'],
    ['30-day review', 'Show your 30-day tracker to a parent'],
  ]) },
  { stage: 2, ages: '18–24', phase: PHASES, lessons: L([
    ['Reading your payslip', 'Find gross pay, tax and take-home on your payslip'],
    ['Taxes in plain words', 'Note your tax bracket (US) or regime (India)'],
    ['The 50/25/15/10 budget', 'Split last month’s spending into the four buckets'],
    ['Good debt, bad debt', 'List every debt with its interest rate'],
    ['Your bank account setup', 'Open or rename a separate savings account'],
    ['Using a card safely', 'Set up autopay for the full card balance'],
    ['Credit score basics', 'Check your credit score (free) and note it'],
    ['Cutting the leaks', 'Cancel one subscription you don’t use'],
    ['One month of costs saved', 'Move money until savings equals one month of costs'],
    ['A side income test', 'Try one side income idea for a weekend'],
    ['Avoiding money traps', 'Read the terms of one loan or buy-now-pay-later offer'],
    ['3-month budget review', 'Log your monthly check-in in the app'],
  ]) },
  { stage: 3, ages: '25–34', phase: PHASES, lessons: L([
    ['Emergency fund: how much', 'Calculate 6 months of essential costs'],
    ['Debt avalanche', 'Order your debts by interest rate in Manage money'],
    ['What an index fund is', 'Look up the S&P 500 or Nifty 50 index fund costs'],
    ['Compounding and time', 'Run the compounding calculator for your age'],
    ['Automate investing', 'Set up a monthly SIP or 401(k) contribution'],
    ['Insurance basics', 'Check you have health and term life cover'],
    ['Employer benefits', 'Find your employer match or PF/NPS details'],
    ['Reading a market brief', 'Watch one daily brief and note the market regime'],
    ['Risk and volatility', 'Read the VIX risk meter and what each zone means'],
    ['Paper-trade one strategy', 'Set up a paper strategy in Grow money'],
    ['Your 6-month fund', 'Move your emergency fund to a separate account'],
    ['3-month investing review', 'Log three months of investing in check-ins'],
  ]) },
  { stage: 4, ages: '35–49', phase: PHASES, lessons: L([
    ['Your freedom number', 'Multiply yearly costs by 25 (US) or 30 (India)'],
    ['Asset allocation', 'Write your target split of stocks, bonds, gold, cash'],
    ['Tax planning', 'List the tax-saving accounts you use (401k/IRA or 80C/NPS)'],
    ['Savings rate', 'Calculate your savings rate for the last 3 months'],
    ['Rebalancing', 'Compare your actual split with your target'],
    ['Term insurance and wills', 'Check your term cover is 10–15x income'],
    ['Kids’ education fund', 'Estimate the cost and start a monthly amount'],
    ['Market cycles', 'Read the Wyckoff and Elliott cards on two stocks'],
    ['Sector rotation', 'Check which sectors are leading on the rotation wheel'],
    ['Investment policy', 'Write a one-page rule for when you buy and sell'],
    ['Avoiding big mistakes', 'List the three money mistakes you will not repeat'],
    ['12-month savings review', 'Confirm a 20%+ savings rate in check-ins'],
  ]) },
  { stage: 5, ages: '50–64', phase: PHASES, lessons: L([
    ['Retirement income', 'Estimate income needed per month in retirement'],
    ['Drawdown risk', 'Plan 2 years of costs in safer assets'],
    ['Healthcare costs', 'Price health cover for the next 10 years'],
    ['Pensions and annuities', 'List every pension and its start date'],
    ['A giving plan', 'Write who and how much you will give each year'],
    ['Mentoring', 'Agree to mentor one younger member'],
    ['Family money talk', 'Hold one money conversation with family'],
    ['Wealth protection', 'Review fraud and scam safeguards on your accounts'],
    ['Business succession', 'Write who runs your business or assets if you can’t'],
    ['Tax-efficient withdrawals', 'Order accounts for withdrawals'],
    ['Simplify', 'Close or merge one account you don’t need'],
    ['Significance review', 'Record your giving plan and mentee in the app'],
  ]) },
  { stage: 6, ages: '65+', phase: PHASES, lessons: L([
    ['Estate basics', 'List every asset and its nominee'],
    ['Wills and trusts', 'Book time to draft or update your will'],
    ['Nominations', 'Check nominations on every account'],
    ['Passing on knowledge', 'Record one money lesson for your family'],
    ['Family money meeting', 'Hold a yearly family money meeting'],
    ['Community capital', 'Explore a community fund or scholarship'],
    ['Foundation basics', 'List causes you want to fund long term'],
    ['Leading with money', 'Share your story with the community'],
    ['Health and care planning', 'Write your care preferences'],
    ['Digital assets', 'Record how to access online accounts'],
    ['Legacy letter', 'Write a letter on values and money'],
    ['Legacy review', 'Confirm your estate plan is in place'],
  ]) },
];

export const trackFor = (stage: number) => TRACKS.find((t) => t.stage === stage) ?? TRACKS[0];

/** Week of the 12-week track, counted from when the member joined (1..12, then repeats as review). */
export function weekOf(joinedISO: string, now: Date = new Date()): number {
  const days = Math.floor((now.getTime() - Date.parse(joinedISO)) / 864e5);
  return (Math.max(0, Math.floor(days / 7)) % 12) + 1;
}

export interface QuizAnswers { income: 'none' | 'some' | 'regular'; savings: 'none' | 'under1' | 'oneToSix' | 'sixPlus'; investing: 'no' | 'sometimes' | 'monthly20' | 'givesBack' }

export const QUIZ: { key: keyof QuizAnswers; q: string; options: { value: string; label: string }[] }[] = [
  { key: 'income', q: 'Do you earn your own money?', options: [{ value: 'none', label: 'Not yet' }, { value: 'some', label: 'Pocket money or part-time' }, { value: 'regular', label: 'Yes, a regular income' }] },
  { key: 'savings', q: 'How many months of costs could your savings cover?', options: [{ value: 'none', label: 'None yet' }, { value: 'under1', label: 'Less than a month' }, { value: 'oneToSix', label: '1 to 6 months' }, { value: 'sixPlus', label: '6 months or more' }] },
  { key: 'investing', q: 'Do you invest every month?', options: [{ value: 'no', label: 'No' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'monthly20', label: 'Yes, and I save 20%+ of income' }, { value: 'givesBack', label: 'Yes, and I also give back or mentor' }] },
];

/**
 * Starting stage from the quiz. Under-18s always start at Startup. The quiz places members up to Success (4);
 * Significance and SIXXAB are reached through monthly check-ins that meet both gates.
 */
export function placeStage(a: QuizAnswers, age: number | null): number {
  if (age !== null && age < 18) return 1;
  if (a.income === 'none') return 1;
  if (a.savings === 'none' || a.savings === 'under1') return 2;
  if (a.savings === 'oneToSix') return 3;
  return a.investing === 'monthly20' || a.investing === 'givesBack' ? 4 : 3;
}
