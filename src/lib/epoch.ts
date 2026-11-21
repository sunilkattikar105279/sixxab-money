// Epoch · the money story: 500 years of empires, money and cycles, and what the data says about the next 200.
// Every number here is from a named source (see EPOCH_SOURCES). Pre-1820 GDP shares are rough scholarly estimates;
// anything after today is a projection or a scenario and is labelled as one.

export type Region = 'china' | 'india' | 'europe' | 'us' | 'japan' | 'rest';
export const REGIONS: { key: Region; name: string; color: string; x: number; y: number }[] = [
  // x/y = position on the stylised world map (0-100)
  { key: 'us', name: 'United States', color: '#5B8DEF', x: 22, y: 38 },
  { key: 'europe', name: 'Western Europe', color: '#C9B26B', x: 49, y: 30 },
  { key: 'india', name: 'India', color: '#F59E5B', x: 68, y: 52 },
  { key: 'china', name: 'China', color: '#FF5C7A', x: 78, y: 38 },
  { key: 'japan', name: 'Japan', color: '#B78CFF', x: 89, y: 36 },
  { key: 'rest', name: 'Rest of the world', color: '#6E7F99', x: 50, y: 70 },
];

/** Share of world GDP (%, purchasing-power basis). Maddison (2001) for 1500-1998; Maddison (2007) for 2003 and his 2030 projection. */
export const GDP_SHARE: { year: number; projected?: boolean; china: number; india: number; europe: number; us: number; japan: number }[] = [
  { year: 1500, china: 25.0, india: 24.5, europe: 17.9, us: 0.3, japan: 3.1 },
  { year: 1600, china: 29.1, india: 22.5, europe: 20.0, us: 0.2, japan: 2.9 },
  { year: 1700, china: 22.3, india: 24.4, europe: 22.5, us: 0.1, japan: 4.1 },
  { year: 1820, china: 32.9, india: 16.0, europe: 23.6, us: 1.8, japan: 3.0 },
  { year: 1870, china: 17.2, india: 12.2, europe: 33.6, us: 8.9, japan: 2.3 },
  { year: 1913, china: 8.9, india: 7.6, europe: 33.5, us: 18.9, japan: 2.6 },
  { year: 1950, china: 4.5, india: 4.2, europe: 26.3, us: 27.3, japan: 3.0 },
  { year: 1973, china: 4.6, india: 3.1, europe: 25.7, us: 22.1, japan: 7.8 },
  { year: 2003, china: 15.1, india: 5.5, europe: 19.2, us: 20.7, japan: 6.6 },
  { year: 2030, projected: true, china: 23.8, india: 10.4, europe: 13.0, us: 17.3, japan: 3.6 },
];
export const restOf = (r: (typeof GDP_SHARE)[number]) => Math.max(0, 100 - r.china - r.india - r.europe - r.us - r.japan);

/** The leading reserve currency and the empire behind it. */
export const EMPIRES: { name: string; currency: string; from: number; to: number | null; rose: string; money: string; mistake: string; lesson: string }[] = [
  { name: 'Portugal', currency: 'Portuguese real', from: 1450, to: 1530, rose: 'Navigation technology opened sea routes to Africa, India and Asia.', money: 'Spice and gold trade controlled by sea.', mistake: 'A tiny population and a succession crisis; absorbed by Spain.', lesson: 'Owning a new route creates wealth fast, but scale and institutions decide how long it lasts.' },
  { name: 'Spain', currency: 'Spanish real (silver dollar)', from: 1530, to: 1640, rose: 'Silver from the Americas flooded the world.', money: 'The silver "piece of eight" became the first global coin.', mistake: 'Spent the silver on wars, then debased the coinage.', lesson: 'Windfall money without productive investment ends in inflation and decline.' },
  { name: 'Netherlands', currency: 'Dutch guilder', from: 1640, to: 1720, rose: 'Trade, shipping and the world’s first stock company (the Dutch East India Company).', money: 'The first stock exchange and a trusted central bank (Bank of Amsterdam).', mistake: 'Overextended in wars with Britain and France; debt rose.', lesson: 'Financial innovation and trust make a small country rich; wars and debt end it.' },
  { name: 'France', currency: 'French livre / franc', from: 1720, to: 1815, rose: 'The largest population and army in Western Europe.', money: 'Paper money experiments (John Law’s bank) and later the franc.', mistake: 'The Mississippi Bubble, revolution-era paper money collapse, endless wars.', lesson: 'Printed money without trust destroys savings; confidence is the real currency.' },
  { name: 'Britain', currency: 'Pound sterling', from: 1815, to: 1920, rose: 'The Industrial Revolution, the navy and a global trade network.', money: 'The gold standard and the City of London as the world’s banker.', mistake: 'Two world wars left huge debts; it lost the empire and the gold standard (1931).', lesson: 'Productivity builds empires; war debt and overreach transfer leadership.' },
  { name: 'United States', currency: 'US dollar', from: 1920, to: null, rose: 'Mass production, innovation, capital markets and winning two world wars without home destruction.', money: 'Bretton Woods (1944), then the floating dollar since 1971, and the deepest capital markets on earth.', mistake: 'Open question: rising debt, political division and challengers.', lesson: 'Still the leader. History says watch debt, internal conflict and a rising rival.' },
];
export const AVG_REIGN = Math.round(EMPIRES.filter((e) => e.to).reduce((a, e) => a + (e.to! - e.from), 0) / EMPIRES.filter((e) => e.to).length);

/** How money itself changed. */
export const MONEY_FORMS: { year: number; label: string; note: string }[] = [
  { year: 1500, label: 'Silver and gold coins', note: 'Value in the metal; whoever finds metal prints money.' },
  { year: 1609, label: 'Public bank money', note: 'Bank of Amsterdam: trusted deposits replace coins in big trade.' },
  { year: 1694, label: 'Central-bank notes', note: 'Bank of England founded to fund war; paper backed by promises.' },
  { year: 1821, label: 'Gold standard', note: 'Britain ties the pound to gold; money is a claim on metal.' },
  { year: 1944, label: 'Bretton Woods', note: 'The dollar tied to gold, other currencies tied to the dollar.' },
  { year: 1971, label: 'Fiat money', note: 'The dollar leaves gold; money is backed by trust in governments.' },
  { year: 2009, label: 'Digital money', note: 'Bitcoin, then UPI, stablecoins and central-bank digital money.' },
];

/** The big cycle, as a sequence of stages (a framework, not a law). */
export const CYCLE: { stage: string; signs: string }[] = [
  { stage: '1 · Rise', signs: 'Education, new technology, strong institutions, low debt, growing trade' },
  { stage: '2 · Golden age', signs: 'Financial centre of the world, reserve currency, high productivity' },
  { stage: '3 · Excess', signs: 'Borrowing to consume, widening wealth gaps, costly overseas commitments' },
  { stage: '4 · Strain', signs: 'Debt grows faster than income, money printing, internal conflict' },
  { stage: '5 · Challenge', signs: 'A rising rival with a cheaper, younger, faster economy' },
  { stage: '6 · Transition', signs: 'War or crisis; the reserve currency and trade centre move' },
];

/** Forward data points (projections, not facts). */
export const FUTURE = {
  population: { now: 8.2, peak: 10.3, peakWhen: 'mid-2080s', y2100: 10.2, china2100: 633 }, // billions; China in millions (UN WPP 2024)
  gdp2075: [ { name: 'China', usdTn: 57 }, { name: 'India', usdTn: 52.5 }, { name: 'United States', usdTn: 51.5 }, { name: 'Indonesia', usdTn: 13.7 }, { name: 'Nigeria', usdTn: 13.1 } ], // Goldman Sachs, real USD
  realRateTrendBpPerYear: 1.6, // Schmelzing / Rogoff-Rossi-Schmelzing: long-run decline in real rates since the 1300s
};

/** The next 200 years in three windows. Data-led first, then scenario-led. */
export const ROADMAP: { window: string; confidence: 'data-led' | 'trend-led' | 'scenario'; world: string; money: string; legacy: string }[] = [
  { window: '2026–2050', confidence: 'data-led', world: 'Asia’s share of world output keeps rising. China and India join the US as the three giants; the world’s five largest economies in 2050 are projected to be China, the US, India, Indonesia and Germany.', money: 'A multi-currency world: the dollar stays first but shares the stage. AI raises productivity; rates stay low by historical standards.', legacy: 'Own the world, not one country. Build skills that work with AI.' },
  { window: '2050–2100', confidence: 'trend-led', world: 'World population peaks at about 10.3 billion in the mid-2080s, then falls; China shrinks towards 633 million by 2100 while India, Africa and the US keep growing longer.', money: 'Ageing societies need income: dividends, rents and royalties matter more. Young, growing nations (India, Indonesia, Nigeria, Pakistan, Egypt) become the growth engines.', legacy: 'Income-producing assets and a family charter that passes values with money.' },
  { window: '2100–2226', confidence: 'scenario', world: 'Beyond data. History suggests at least one more leadership change (the average reign is under 100 years) and several new technology waves: energy abundance, space, biology, machine intelligence.', money: 'Money keeps moving from metal to trust to code. What lasts: productive ownership, trusted institutions and education.', legacy: 'A legacy is a system, not a sum: education, governance and diversified ownership across generations.' },
];

export const FACTORS: { name: string; why: string }[] = [
  { name: 'Demographics', why: 'More young workers means more output and savings; ageing means slower growth and more spending on care.' },
  { name: 'Technology', why: 'Every empire rode a new technology: ships, printing, steam, electricity, computers, AI.' },
  { name: 'Energy', why: 'Cheap energy powers growth. Coal made Britain, oil made the US century; the next leader likely masters clean energy.' },
  { name: 'Debt', why: 'Debt pulls growth forward. When it outgrows income, empires print money and lose trust.' },
  { name: 'Trade routes', why: 'Whoever controls the routes (sea lanes, ports, payment rails, data networks) collects the toll.' },
  { name: 'Institutions and law', why: 'Property rights, courts and trusted central banks let money stay and compound.' },
  { name: 'War and peace', why: 'Wars destroy wealth and move leadership; long peace lets compounding work.' },
  { name: 'Education', why: 'Rising empires out-educate their rivals; falling ones stop investing in people.' },
];

export const LEGACY_RULES: string[] = [
  'Own productive assets, not just money: money is a promise, businesses and land are claims on real output.',
  'Spread across countries and currencies: no empire has led forever, and the leader at your grandchildren’s age may not be today’s.',
  'Avoid the empire mistakes in your own house: living on debt, debasing your savings with inflation, and fighting family wars over money.',
  'Keep a cash buffer for the bad years: every cycle has them, and forced sellers lose.',
  'Invest in education every generation: it is the only asset that compounds even when markets fall.',
  'Write a family money charter: values, rules for spending capital, and how decisions are made.',
  'Think in decades: 1 dollar in equities in 1900 became 124,854 by 2025, but only for those who stayed invested.',
];

export const EPOCH_SOURCES: { name: string; url: string }[] = [
  { name: 'Angus Maddison, The World Economy: A Millennial Perspective (OECD, 2001)', url: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2001/06/the-world-economy_g1gh13a3/9789264189980-en.pdf' },
  { name: 'Angus Maddison, Shares of the Rich and the Rest in the World Economy, 1820–2030', url: 'https://warwick.ac.uk/fac/soc/economics/seminars/seminars/conferences/econchange/programme/maddison.pdf' },
  { name: 'World Reserve Currencies Since 1450', url: 'https://shirha.github.io/economy/World%20Reserve%20Currencies%20Since%201450.pdf' },
  { name: 'Goldman Sachs Research, The Global Economy in 2075', url: 'https://www.goldmansachs.com/insights/articles/the-global-economy-in-2075-growth-slows-as-asia-rises' },
  { name: 'United Nations, World Population Prospects 2024', url: 'https://www.un.org/en/node/219445' },
  { name: 'Paul Schmelzing, Eight centuries of global real interest rates (Bank of England)', url: 'https://www.bankofengland.co.uk/working-paper/2020/eight-centuries-of-global-real-interest-rates-r-g-and-the-suprasecular-decline-1311-2018' },
  { name: 'UBS Global Investment Returns Yearbook 2026', url: 'https://www.ubs.com/global/en/media/display-page-ndp/en-20260303-global-investment-returns-yearbook-2026.html' },
];
