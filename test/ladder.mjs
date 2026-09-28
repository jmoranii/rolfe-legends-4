// Rolfe Legends 4 — Sass Level ladder rail. Same seeds at every level (common random
// numbers), so each level's winrate is compared like-for-like. Rails: monotonic
// non-increasing (within 2 pts of noise) and Sass Level 10 under 10%.
//   node test/ladder.mjs [runs-per-hero-per-strategy]
import { simulateRun, newStats } from './selfplay.mjs';

const RUNS = Number(process.argv[2] || 40);
if (!Number.isFinite(RUNS) || RUNS < 1) { console.log('RAIL FAIL: bad run count'); process.exit(1); }
const HEROES = ['wyatt', 'aaron', 'liam'];
const STRATS = ['saver', 'spender', 'arena'];
const rates = [];
for (let L = 0; L <= 10; L++) {
  let wins = 0, n = 0;
  for (const h of HEROES) for (const s of STRATS) for (let i = 0; i < RUNS; i++) {
    const log = simulateRun(h, s, (7000 + i * 7907 + h.length * 13 + s.length * 101) >>> 0, newStats(), L);
    n++; if (log.won) wins++;
  }
  rates.push(wins / n);
}
const fails = [];
rates.forEach((r, L) => { if (L > 0 && r > rates[L - 1] + 0.02) fails.push(`SL${L} ${(r * 100).toFixed(1)}% > SL${L - 1} ${(rates[L - 1] * 100).toFixed(1)}%`); });
if (rates[10] >= 0.10) fails.push(`SL10 ${(rates[10] * 100).toFixed(1)}% ≥ 10%`);
console.log('Sass ladder: ' + rates.map((r, L) => `SL${L} ${(r * 100).toFixed(1)}%`).join(' · '));
console.log(fails.length ? `LADDER: FAIL\n  - ${fails.join('\n  - ')}` : 'LADDER: ALL CLEAR');
process.exitCode = fails.length ? 1 : 0;
