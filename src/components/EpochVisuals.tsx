'use client';
import { useState } from 'react';
import { GDP_SHARE, REGIONS, EMPIRES, restOf, type Region } from '@/lib/epoch';

const share = (row: (typeof GDP_SHARE)[number], k: Region) => (k === 'rest' ? restOf(row) : row[k]);

/** Stylised world map: one bubble per region, sized by its share of world output in the chosen year. */
export function WorldMap() {
  const [i, setI] = useState(GDP_SHARE.findIndex((r) => r.year === 2003));
  const row = GDP_SHARE[i];
  const top = REGIONS.filter((r) => r.key !== 'rest').sort((a, b) => share(row, b.key) - share(row, a.key))[0];
  return (
    <div>
      <svg viewBox="0 0 1000 520" width="100%" role="img" aria-label={`World output in ${row.year}: ${REGIONS.map((r) => `${r.name} ${share(row, r.key).toFixed(1)}%`).join(', ')}`}>
        <rect x={0} y={0} width={1000} height={520} rx={18} fill="#0d1d33" />
        {/* stylised continents */}
        <g fill="#16304f" opacity={0.9}>
          <path d="M90 120 C150 70 300 80 330 150 C350 220 300 260 250 300 C230 340 260 400 240 450 C200 430 170 360 150 310 C110 260 60 190 90 120Z" />
          <path d="M430 110 C480 70 560 80 580 120 C600 160 560 190 520 200 C490 205 450 180 430 150Z" />
          <path d="M460 220 C520 210 580 240 590 300 C600 370 560 440 520 460 C490 420 470 360 450 300Z" />
          <path d="M590 100 C690 60 860 70 940 140 C960 190 900 230 840 240 C800 300 740 330 700 320 C670 290 640 260 610 230 C590 190 570 140 590 100Z" />
          <path d="M800 380 C850 370 900 390 910 420 C890 450 830 450 800 430Z" />
        </g>
        {REGIONS.map((r) => {
          const v = share(row, r.key), rad = 8 + Math.sqrt(v) * 15;
          return (
            <g key={r.key}>
              <circle cx={r.x * 10} cy={r.y * 5.2} r={rad} fill={r.color} fillOpacity={r.key === 'rest' ? 0.25 : 0.75} stroke={r.key === top.key ? '#fff' : 'none'} strokeWidth={3} />
              <text x={r.x * 10} y={r.y * 5.2 + 5} textAnchor="middle" fontSize={v > 8 ? 20 : 14} fontWeight={800} fill="#fff">{v.toFixed(0)}%</text>
              <text x={r.x * 10} y={r.y * 5.2 + rad + 18} textAnchor="middle" fontSize={14} fill="#c9d4e3">{r.name}</text>
            </g>
          );
        })}
        <text x={30} y={50} fontSize={40} fontWeight={800} fill="#fff">{row.year}{row.projected ? ' (projection)' : ''}</text>
        <text x={30} y={78} fontSize={15} fill="#9fb0c8">Largest economy: {top.name} · share of world output</text>
      </svg>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }} role="group" aria-label="Choose a year">
        {GDP_SHARE.map((r, k) => <button key={r.year} type="button" className={`btn ${k === i ? 'btn-gold' : 'btn-line'}`} style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setI(k)} aria-pressed={k === i}>{r.year}{r.projected ? '*' : ''}</button>)}
      </div>
    </div>
  );
}

/** 500 years of share of world output as stacked bands. */
export function ShareChart() {
  const W = 900, H = 340, pl = 40, pr = 120, pt = 14, pb = 30;
  const y0 = 1500, y1 = 2030;
  const X = (y: number) => pl + ((y - y0) / (y1 - y0)) * (W - pl - pr), Y = (v: number) => pt + (1 - v / 100) * (H - pt - pb);
  const order: Region[] = ['china', 'india', 'japan', 'europe', 'us', 'rest'];
  const bands = order.map((k, idx) => {
    const below = (row: (typeof GDP_SHARE)[number]) => order.slice(0, idx).reduce((a, q) => a + share(row, q), 0);
    const top = GDP_SHARE.map((r) => `${X(r.year).toFixed(1)},${Y(below(r) + share(r, k)).toFixed(1)}`);
    const bot = [...GDP_SHARE].reverse().map((r) => `${X(r.year).toFixed(1)},${Y(below(r)).toFixed(1)}`);
    const last = GDP_SHARE[GDP_SHARE.length - 1];
    return { k, d: `M${top.join(' L')} L${bot.join(' L')} Z`, labelY: Y(below(last) + share(last, k) / 2) };
  });
  const proj = GDP_SHARE.find((r) => r.projected)!, prev = GDP_SHARE[GDP_SHARE.indexOf(proj) - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Share of world output by region, 1500 to 2030">
      {bands.map((b) => { const reg = REGIONS.find((r) => r.key === b.k)!; return <path key={b.k} d={b.d} fill={reg.color} fillOpacity={b.k === 'rest' ? 0.25 : 0.8} stroke="#0b1b33" strokeWidth={1} />; })}
      <rect x={X(prev.year)} y={pt} width={X(proj.year) - X(prev.year)} height={H - pt - pb} fill="#0b1b33" fillOpacity={0.35} />
      <text x={(X(prev.year) + X(proj.year)) / 2} y={pt + 14} textAnchor="middle" fontSize={11} fill="#fff">projection</text>
      {bands.map((b) => { const reg = REGIONS.find((r) => r.key === b.k)!; return <text key={b.k} x={W - pr + 8} y={b.labelY + 4} fontSize={12} fill={reg.color}>{reg.name}</text>; })}
      {[0, 25, 50, 75, 100].map((v) => <text key={v} x={pl - 6} y={Y(v) + 4} textAnchor="end" fontSize={10} fill="#9fb0c8">{v}%</text>)}
      {[1500, 1600, 1700, 1820, 1870, 1913, 1950, 2003, 2030].map((y) => <text key={y} x={X(y)} y={H - 10} textAnchor="middle" fontSize={10} fill="#9fb0c8">{y}</text>)}
    </svg>
  );
}

/** The six reserve-currency empires on one time axis, with the average reign marked. */
export function EmpireTimeline({ now = new Date().getUTCFullYear() }: { now?: number }) {
  const W = 900, H = 60 + EMPIRES.length * 38, pl = 120, pr = 20, x0 = 1440, x1 = 2060;
  const X = (y: number) => pl + ((y - x0) / (x1 - x0)) * (W - pl - pr);
  const cols = ['#2EC4B6', '#C9B26B', '#F59E5B', '#B78CFF', '#FF5C7A', '#5B8DEF'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Reserve currencies since 1450: ${EMPIRES.map((e) => `${e.name} ${e.from} to ${e.to ?? 'today'}`).join(', ')}`}>
      {[1450, 1550, 1650, 1750, 1850, 1950, 2050].map((y) => <g key={y}><line x1={X(y)} x2={X(y)} y1={20} y2={H - 24} stroke="#22344f" /><text x={X(y)} y={H - 8} textAnchor="middle" fontSize={11} fill="#9fb0c8">{y}</text></g>)}
      {EMPIRES.map((e, i) => {
        const y = 30 + i * 38, end = e.to ?? now;
        return (
          <g key={e.name}>
            <text x={pl - 10} y={y + 18} textAnchor="end" fontSize={13} fontWeight={700} fill="#fff">{e.name}</text>
            <rect x={X(e.from)} y={y} width={X(end) - X(e.from)} height={26} rx={6} fill={cols[i]} fillOpacity={0.85} />
            {!e.to && <rect x={X(end)} y={y} width={X(2060) - X(end)} height={26} rx={6} fill={cols[i]} fillOpacity={0.15} strokeDasharray="4 4" stroke={cols[i]} />}
            <text x={X(e.from) + 6} y={y + 17} fontSize={11} fontWeight={700} fill="#0b1b33">{e.from}–{e.to ?? 'now'} · {end - e.from}y</text>
          </g>
        );
      })}
    </svg>
  );
}
