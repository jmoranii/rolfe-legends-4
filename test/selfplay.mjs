// Rolfe Legends 4 — selfplay balance harness. Simulates FULL runs (3 worlds, one
// deck) with hero-aware bots that genuinely play Momentum, the Big Hammer and the
// Potty meter, respect (or knowingly break) Tea Party Rules, and follow one of three
// economy strategies: Saver / Spender / Arena-hunter. Reports every GOAL.md Phase 4
// rail and exits non-zero on a rail failure.
//   node test/selfplay.mjs [runs-per-hero-per-strategy] [--sl N]

import { makeRng } from '../js/rng.js';
import { CARDS, HEROES, cardInfo, makeCard, upgradableCards, HAMMER_ID } from '../js/cards.js';
import { canSticker } from '../js/stickers.js';
import { PETS } from '../js/pets.js';
import { WORLDS } from '../js/worlds.js';
import { RULE_IDS } from '../js/rules.js';
import * as C from '../js/combat.js';
import * as R from '../js/run.js';

const args = process.argv.slice(2);
const RUNS = Number(args.find((a) => /^\d+$/.test(a)) ?? 60);
if (!Number.isFinite(RUNS) || RUNS < 1) { console.log(`RAIL FAIL: bad run count ${args[0]}`); process.exit(1); }
const SL = args.includes('--sl') ? Number(args[args.indexOf('--sl') + 1]) : 0;
const HERO_IDS = ['wyatt', 'aaron', 'liam'];
const STRATS = ['saver', 'spender', 'arena'];

// ---------- card tier list (the harness measures; data gets tuned) ----------
export const PICK = {
  zoom: 6, cartwheel: 7, quick_pass: 5, tap_tap: 5, juke: 6, warm_up: 5, slide_tackle: 6, hat_trick: 7, blur_kick: 7,
  shuffle_step: 4, keep_moving: 6, whirlwind_kick: 7, lightning_legs: 8, photo_finish: 8, relay_race: 7,
  uppercut: 6, temper: 7, brace: 6, shoulder_charge: 6, deep_breath: 6, iron_stance: 6, wide_swing: 7, hammer_toss: 6,
  get_pumped: 6, anvil: 7, bounce_back: 6, stomp: 6, forged_in_rolfe: 8, titan_grip: 8, legendary_swing: 7,
  big_gulp: 6, tantrum_toss: 6, blanket_fort: 7, wiggle: 5, naptime: 5, uh_oh: 6, hold_it: 6, potty_dance: 6,
  double_flush: 6, big_kid_stickers: 7, big_boy_undies: 7, splash_zone: 6, royal_throne: 8, emergency: 6, all_by_myself: 6,
};
const BOSS_PREF = ['stellas_crown', 'party_hat', 'lucys_mega_squishy', 'sticker_pack', 'golden_pet_collar'];

// ---------- the turn policy ----------
function incoming(state) {
  let t = 0;
  for (const e of C.livingEnemies(state)) { const p = C.intentPreview(state, e); if (p) t += p.per * p.times; }
  return t;
}
function effHp(e) { return e.hp + (e.block || 0) + (e.shield || 0) + (e.squishLeft || 0); }
const isPayoff = (info) => (info.fx || []).some((o) => o.ifMomentum || o.dmgPerMomentum) || !!info.momentumDiscount;

function scoreCard(state, c, ctx) {
  const info = cardInfo(c);
  const h = state.hero;
  const cost = C.effectiveCost(state, c);
  const enemies = C.targetableEnemies(state);
  if (!enemies.length) return { s: -1 };
  const target = enemies.slice().sort((a, b) => effHp(a) - effHp(b))[0];
  let s = 0;
  if (info.type === 'power') s += state.turn <= 3 ? 14 : 6;
  if (info.type === 'attack') {
    const per = C.previewCardDamage(state, info);
    const allE = (info.fx || []).some((o) => o.allEnemies) || (c.id === HAMMER_ID && state.hammer.all);
    if (allE) { for (const e of enemies) { s += Math.min(per, effHp(e)); if (per >= effHp(e)) s += 6; } }
    else { s += Math.min(per, effHp(target)); if (per >= effHp(target)) s += 8; }
  }
  let blk = 0;
  for (const o of info.fx || []) {
    if (o.block != null) blk += o.block;
    if (o.pottySpend) blk += o.pottySpend.block;
    if (o.hammerHalf && o.hammerHalf.kind === 'block') blk += Math.floor(C.hammerDamage(state) / 2) + o.hammerHalf.plus;
    if (o.ifMomentum && state.momentum + 1 >= o.ifMomentum.n) for (const x of o.ifMomentum.fx) if (x.block) blk += x.block;
  }
  const need = Math.max(0, ctx.incoming - h.block);
  s += Math.min(blk, need) * 1.15 + Math.max(0, blk - need) * 0.08;
  for (const o of info.fx || []) {
    if (o.draw) s += 2.2 * o.draw;
    if (o.relay) s += 3.5 * o.relay;
    if (o.discardHandDraw) s += state.hand.length >= 4 ? 2 : -2;
    if (o.hammerPlus) s += o.hammerPlus * (ctx.hammerAhead ? 1.4 : 0.6);
    if (o.hammerAll) s += enemies.length > 1 ? 10 : 2;
    if (o.hammerNextDiscount) s += ctx.hammerInHand ? 3 : 0.5;
    if (o.hammerBounce) s += ctx.hammerInHand && h.energy - cost >= 2 ? 9 : -1;
    if (o.status && o.status.k === 'pumped') s += o.status.n * 3;
    if (o.status && o.status.k === 'wobbly') s += Math.min(ctx.incoming, 12) * 0.25 * o.status.n;
    if (o.status && o.status.k === 'wideOpen') s += 3;
    if (o.potty) s += o.potty * 1.1 + (state.potty + o.potty >= 10 ? 6 + 9 * enemies.length : 0);
    if (o.doubleFlush) s += 7;
    if (o.emergency != null) s += state.potty >= o.emergency ? 10 + 12 * enemies.length : -5;
  }
  if (isPayoff(info) && ctx.cheapOthers > 0 && !(info.type === 'attack' && C.previewCardDamage(state, info) >= effHp(target))) s -= 4;
  if (HEROES[state.heroId].mechanic === 'momentum' && cost === 0) s += 1.5;
  if (c.id === HAMMER_ID && ctx.forgeInHand && h.energy - cost < 1) s -= 3;
  if (C.cardBreaksRule(state, c)) s -= ctx.sassNow >= 3 ? 0 : 7;
  return { s: s - cost * 0.6, target };
}

export function playTurn(state) {
  let guard = 60;
  while (!state.over && guard-- > 0 && state.phase === 'hero') {
    const playable = state.hand.filter((c) => C.canPlay(state, c));
    const ctx = {
      incoming: incoming(state),
      hammerInHand: state.hand.some((c) => c.id === HAMMER_ID),
      hammerAhead: [...state.hand, ...state.draw].some((c) => c.id === HAMMER_ID),
      forgeInHand: state.hand.some((c) => (cardInfo(c).fx || []).some((o) => o.hammerPlus) && C.canPlay(state, c)),
      cheapOthers: playable.filter((c) => !isPayoff(cardInfo(c)) && C.effectiveCost(state, c) <= 1).length,
      sassNow: C.sassCount(state),
    };
    let best = null, bestS = 0.5;
    for (const c of playable) {
      const r = scoreCard(state, c, ctx);
      if (r.s > bestS) { bestS = r.s; best = { c, target: r.target }; }
    }
    if (!best) {
      const sass = state.hand.find((c) => c.id === 'sass');
      if (sass && C.canSaySorry(state, sass)) { C.saySorry(state, sass); continue; }
      break;
    }
    C.playCard(state, best.c, best.target);
  }
}

export function fight(run, encounter, kind, seed, stats) {
  const st = C.startCombat(run, encounter, makeRng(seed), { kind });
  let turns = 0;
  while (!st.over && turns < 60) { playTurn(st); if (st.over) break; C.endTurn(st); turns++; }
  if (!st.over) { st.over = true; st.won = false; st.hero.hp = 0; st.killedBy = { name: 'STALEMATE' }; }
  if (stats) stats.turnsBy[kind].push(st.turn);
  return st;
}

// ---------- run-level decisions ----------
function bestUpgrade(run) {
  const ups = upgradableCards(run.deck);
  const v = (c) => (PICK[c.id] ?? 3) + (c.id === HAMMER_ID ? 4 : 0);
  ups.sort((a, b) => v(b) - v(a));
  return ups[0];
}
function worstCard(run) {
  const v = (c) => PICK[c.id] ?? (CARDS[c.id].rarity === 'starter' ? 1 : 3);
  const cands = run.deck.filter((c) => !CARDS[c.id].signature);
  cands.sort((a, b) => v(a) - v(b));
  return cands[0];
}
// each simulated kid has their own taste: tier values jitter ±2 per run (seeded), so
// card-presence stats measure card strength, not one fixed bot's habits
let taste = {};
function setTaste(seed) {
  const g = makeRng(seed ^ 0x7A57E);
  taste = {};
  for (const k of Object.keys(PICK)) taste[k] = PICK[k] + (g.random() * 4 - 2);
}
const pv = (id) => taste[id] ?? PICK[id] ?? 4;
function pickCard(run, ids) {
  let best = null, bs = 5.4;
  const counts = {};
  for (const c of run.deck) counts[c.id] = (counts[c.id] || 0) + 1;
  for (const id of ids) { const s = pv(id) - (counts[id] || 0) * 1.2; if (s > bs) { bs = s; best = id; } }
  return best;
}
function stickerTarget(run, sid) {
  const cands = run.deck.filter((c) => canSticker(c, sid) === true);
  if (!cands.length) return null;
  const pref = (c) => (c.id === HAMMER_ID ? 20 : 0) + (PICK[c.id] ?? 2) + (CARDS[c.id].rarity === 'starter' ? 0 : 2);
  cands.sort((a, b) => pref(b) - pref(a));
  return cands[0];
}
const tierEarn = (id) => ({ common: 3, rare: 5, super: 7 })[PETS[id].tier];
function handlePet(run, id) {
  if (!id) return;
  const r = R.addPet(run, id);
  if (r.full) {
    let lo = 0;
    run.pets.forEach((p, i) => { if (tierEarn(p.id) < tierEarn(run.pets[lo].id)) lo = i; });
    if (tierEarn(id) > tierEarn(run.pets[lo].id)) R.swapPet(run, lo, id);
  }
}

function doShop(run, shop, strat) {
  // Saver reserves for a LATER purchase (the next Arena / World-3 shop), never hoards forever
  const nextFee = run.world < 3 ? R.arenaInfo(run).fee : 0;
  const reserve = strat === 'spender' ? 0 : strat === 'saver' ? (run.world < 3 ? 60 : 0) : nextFee;
  let guard = 10;
  while (guard-- > 0) {
    const spendable = run.coins - reserve;
    if (!shop.removed && spendable >= shop.removePrice && run.deck.length > 9) { const w = worstCard(run); if (w && R.shopRemoveCard(run, shop, w.uid)) continue; }
    const si = shop.stickers.findIndex((x) => x.price <= spendable && stickerTarget(run, x.id));
    if (si >= 0) { const sid = shop.stickers[si].id; if (R.shopBuySticker(run, shop, si, stickerTarget(run, sid).uid)) continue; }
    const ci = shop.cards.findIndex((x) => x.price <= spendable && pickCard(run, [x.id]));
    if (ci >= 0 && R.shopBuyCard(run, shop, ci)) continue;
    break;
  }
}

function chooseNode(run, strat) {
  const opts = R.nextNodes(run);
  const hpPct = run.hp / run.maxHp;
  const score = (n) => {
    if (n.type === 'arena') {
      if (!R.arenaInfo(run).affordable) return -5;
      const want = strat === 'arena' ? 12 : strat === 'saver' ? 6 : 3;
      return hpPct > 0.55 ? want : -3;
    }
    if (n.type === 'elite') return hpPct > 0.65 ? 4 : -4;
    if (n.type === 'fight') return 1;
    return 0;
  };
  return opts.slice().sort((a, b) => score(b) - score(a))[0];
}

function spendFreeStickers(run) {
  const order = ['sparkle', 'star', 'heart', 'lightning', 'rainbow', 'smiley'];
  let g = 10;
  while (run.freeStickers > 0 && g-- > 0) {
    const sid = order.find((s) => stickerTarget(run, s));
    if (!sid) break;
    R.applyFreeSticker(run, sid, stickerTarget(run, sid).uid);
  }
}

function doVisitor(run, rng) {
  const offers = R.visitorOffers(run);
  let pick;
  if (run.world === 1) pick = 'remove2';
  else if (run.world === 2) pick = run.pets.length < run.petSlots ? 'super_pet' : 'upgrade3';
  else pick = run.hp / run.maxHp < 0.7 ? 'heal_full' : 'boss_treasure2';
  if (!offers.includes(pick)) pick = offers[0];
  const r = R.applyVisitor(run, pick, rng);
  if (r.pet && r.petResult && r.petResult.full) handlePet(run, r.pet);
  if (r.pick === 'rare') { const id = pickCard(run, r.options) || r.options[0]; run.deck.push(makeCard(id)); }
  if (r.pick === 'remove') for (let i = 0; i < r.n; i++) { const w = worstCard(run); if (w) R.removeCard(run, w.uid); }
  if (r.pick === 'upgrade') for (let i = 0; i < r.n; i++) { const u = bestUpgrade(run); if (u) R.restPractice(run, u.uid); }
  if (r.pick === 'boss') { const t = BOSS_PREF.find((x) => r.options.includes(x)) || r.options[0]; if (t) R.gainTreasure(run, t); }
  if (r.pick === 'duplicate') { const c = run.deck.slice().sort((a, b) => (PICK[b.id] ?? 1) - (PICK[a.id] ?? 1))[0]; R.duplicateCard(run, c.uid); }
  spendFreeStickers(run);
}

export function simulateRun(hero, strat, seed, stats, sassLevel = SL) {
  const run = R.newRun(hero, seed, { sassLevel });
  const rng = makeRng(seed ^ 0xBEEF);
  setTaste(seed);
  const log = { hero, strat, won: false, world: 1, killer: null, spendableBeforeFinalShop: 0 };
  for (;;) {
    if (!run.visitorDone) doVisitor(run, rng);
    const node = chooseNode(run, strat);
    const res = R.enterMapNode(run, node.id);
    let encounter = null;
    const kind = res.type;
    if (res.type === 'shop') { if (run.world === 3) log.spendableBeforeFinalShop = run.coins; doShop(run, res.shop, strat); continue; }
    if (res.type === 'treasure') continue;
    if (res.type === 'rest') {
      if (run.hp / run.maxHp < 0.6) R.restHeal(run); else { const u = bestUpgrade(run); if (u) R.restPractice(run, u.uid); else R.restHeal(run); }
      continue;
    }
    if (res.type === 'arena') {
      encounter = R.enterArena(run);
      if (!encounter) { stats.arenaBroke += 1; continue; }
      stats.arenaEntered += 1;
    } else encounter = res.encounter;
    if (kind === 'boss' && run.world === 3) {
      const feats = new Set(run.deck.filter((c) => CARDS[c.id].rarity !== 'starter').map((c) => c.id));
      for (const c of run.deck) if (c.sticker) feats.add(`${c.id}:${c.sticker}`);
      log.finalDeck = feats;
    }
    const st = fight(run, encounter, kind, (seed * 31 + run.world * 1009 + run.floor * 97) >>> 0, stats);
    const encKey = `${kind}:${(encounter.enemies || []).join('+')}`;
    if (encounter.rule && kind !== 'arena') {
      const k = `${hero}:${encounter.rule}`;
      const rf = stats.ruleFights[k] || (stats.ruleFights[k] = { n: 0, hp: 0, lost: 0 });
      rf.n++; rf.hp += st.hpLostThisFight || 0; if (!st.won) rf.lost++;
    }
    if (!st.won) {
      log.killer = encKey; log.world = run.world;
      stats.deaths[encKey] = (stats.deaths[encKey] || 0) + 1;
      break;
    }
    R.applyCombatResult(run, st, kind === 'arena' ? 'elite' : kind);
    if (run.world === 3 && kind !== 'boss') stats.sassPerW3.push(st.sassAdded || 0);
    const rw = R.fightRewards(run, kind, rng);
    if (kind === 'arena') {
      stats.arenaWon += 1;
      const choice = strat === 'arena' || run.pets.length < run.petSlots ? 'pet' : 'card';
      const p = R.arenaPrize(run, choice, rng);
      if (p.pet && p.petResult && p.petResult.full) handlePet(run, p.pet);
      if (p.cards) { const id = pickCard(run, p.cards); if (id) run.deck.push(makeCard(id)); spendFreeStickers(run); }
    }
    handlePet(run, rw.petDrop);
    const id = pickCard(run, rw.cards);
    if (id) run.deck.push(makeCard(id));
    if (kind === 'boss') {
      if (run.world >= 3) { log.won = true; log.world = 3; break; }
      R.afterBoss(run);
      if (rw.bossTreasures && rw.bossTreasures.length) { const t = BOSS_PREF.find((x) => rw.bossTreasures.includes(x)) || rw.bossTreasures[0]; R.gainTreasure(run, t); spendFreeStickers(run); }
      R.advanceWorld(run);
    }
  }
  stats.turnsTotal.push(run.stats.turns);
  stats.coinsBase.push(run.stats.coinsBase); stats.coinsPets.push(run.stats.coinsPets);
  if (log.won) { stats.wins += 1; stats.winTurns.push(run.stats.turns); }
  // deck fingerprint for the dominance (win-lift) rail — only decks that REACHED the final
  // boss, so won-vs-lost compares decks of the same length (controls for run length)
  if (log.finalDeck) stats.decks.push({ hero, won: log.won, feats: log.finalDeck });
  stats.spendable.push(log.spendableBeforeFinalShop);
  return log;
}

export function newStats() {
  return { turnsBy: { fight: [], elite: [], boss: [], arena: [] }, deaths: {}, sassPerW3: [], ruleFights: {},
    arenaBroke: 0, arenaEntered: 0, arenaWon: 0, turnsTotal: [], winTurns: [], coinsBase: [], coinsPets: [],
    wins: 0, spendable: [], decks: [] };
}
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (x) => `${(x * 100).toFixed(1)}%`;

// ---------- main (skipped when imported) ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const all = newStats();
  const table = {};
  const byHero = {};
  const seedBase = 1000 + SL * 100000;
  for (const hero of HERO_IDS) {
    byHero[hero] = { runs: 0, wins: 0 };
    for (const strat of STRATS) {
      let wins = 0;
      for (let i = 0; i < RUNS; i++) {
        const log = simulateRun(hero, strat, (seedBase + i * 7907 + hero.length * 13 + strat.length * 101) >>> 0, all);
        if (log.won) wins++;
        byHero[hero].runs++; if (log.won) byHero[hero].wins++;
      }
      table[`${hero}/${strat}`] = wins / RUNS;
    }
  }
  // starter decks vs every World-1 normal fight (fresh HP) — >90% each
  const starterRes = {};
  for (const hero of HERO_IDS) {
    const enc = WORLDS[1].encounters;
    for (const group of [...enc.easy, ...enc.hard]) {
      let w = 0; const N = 40;
      for (let i = 0; i < N; i++) {
        const run = R.newRun(hero, 7 + i, { sassLevel: SL });
        if (fight(run, { enemies: group }, 'fight', 99 + i * 17, null).won) w++;
      }
      starterRes[`${hero}:${group.join('+')}`] = w / N;
    }
  }
  const out = [];
  const P = (s) => out.push(s);
  P(`RL4 selfplay — ${RUNS} runs per hero per strategy (${RUNS * 9} runs)${SL ? ` · Sass Level ${SL}` : ''}`);
  for (const hero of HERO_IDS) P(`  ${hero.padEnd(6)} ${pct(byHero[hero].wins / byHero[hero].runs)}   ` + STRATS.map((s) => `${s} ${pct(table[`${hero}/${s}`])}`).join(' · '));
  const heroRates = HERO_IDS.map((h) => byHero[h].wins / byHero[h].runs);
  const stratRates = STRATS.map((s) => mean(HERO_IDS.map((h) => table[`${h}/${s}`])));
  P(`  strategies: ` + STRATS.map((s, i) => `${s} ${pct(stratRates[i])}`).join(' · '));
  P(`  median turns: fight ${median(all.turnsBy.fight)} · elite ${median(all.turnsBy.elite)} · boss ${median(all.turnsBy.boss)} · arena ${median(all.turnsBy.arena)}`);
  const winTurns = mean(all.winTurns);
  const estMin = (winTurns * 15) / 60 + 8;
  P(`  completed-run turns ${winTurns.toFixed(0)} → est ${estMin.toFixed(1)} min (15 s/turn + 8 min scenes & choices)`);
  P(`  coins/run: base ${mean(all.coinsBase).toFixed(0)} · pets ${mean(all.coinsPets).toFixed(0)} · coins at World-3 shop ${mean(all.spendable).toFixed(0)} · arenas entered ${all.arenaEntered} (skipped broke ${all.arenaBroke}, won ${all.arenaWon})`);
  P(`  Sass per World-3 fight: ${mean(all.sassPerW3).toFixed(2)}`);
  const deathTotal = Object.values(all.deaths).reduce((a, b) => a + b, 0) || 1;
  const topDeaths = Object.entries(all.deaths).sort((a, b) => b[1] - a[1]).slice(0, 8);
  P(`  top deaths: ` + topDeaths.map(([k, n]) => `${k} ${pct(n / deathTotal)}`).join(' · '));
  // dominance: a card (or card:sticker combo) in >50% of a hero's WINNING decks that is
  // also far rarer in that hero's losing decks (win-lift ≥ 1.6) is a must-pick → flag it
  const dominant = [];
  const topLines = [];
  for (const h of HERO_IDS) {
    const ds = all.decks.filter((d) => d.hero === h);
    const wins = ds.filter((d) => d.won), losses = ds.filter((d) => !d.won);
    const cnt = {};
    for (const d of ds) for (const f of d.feats) { (cnt[f] || (cnt[f] = { w: 0, l: 0 })); if (d.won) cnt[f].w++; else cnt[f].l++; }
    const rows = Object.entries(cnt).map(([f, c]) => ({ f, pw: c.w / Math.max(1, wins.length), pl: c.l / Math.max(1, losses.length) }))
      .sort((a, b) => b.pw - a.pw);
    topLines.push(`${h} (${wins.length}w/${losses.length}l at Delilah): ` + rows.slice(0, 3).map((r) => `${r.f} ${pct(r.pw)}/${pct(r.pl)}`).join(' '));
    for (const r of rows) if (wins.length >= 10 && losses.length >= 5 && r.pw > 0.5 && r.pw / Math.max(0.01, r.pl) >= 1.6) dominant.push(`${h}:${r.f} in ${pct(r.pw)} of wins vs ${pct(r.pl)} of losses`);
  }
  P(`  top features (in wins / in losses): ${topLines.join(' | ')}`);
  const starterFails = Object.entries(starterRes).filter(([, r]) => r < 0.9);
  P(`  starter vs W1 normals: ${Object.keys(starterRes).length - starterFails.length}/${Object.keys(starterRes).length} ≥90%` + (starterFails.length ? ` · FAIL ${starterFails.map(([k, r]) => `${k} ${pct(r)}`).join(', ')}` : ''));
  const ruleFail = [];
  const ruleLines = [];
  for (const h of HERO_IDS) {
    const rows = RULE_IDS.map((r) => ({ r, ...(all.ruleFights[`${h}:${r}`] || { n: 0, hp: 0, lost: 0 }) })).filter((x) => x.n > 0);
    const avgWin = mean(rows.map((x) => 1 - x.lost / x.n));
    for (const x of rows) { const w = 1 - x.lost / x.n; if (x.n >= 20 && avgWin - w > 0.15) ruleFail.push(`${h}:${x.r} ${pct(w)} vs ${pct(avgWin)}`); }
    ruleLines.push(`${h} ` + rows.map((x) => `${x.r.split('_')[0]} ${(x.hp / x.n).toFixed(1)}hp/${pct(1 - x.lost / x.n)}`).join(' '));
  }
  P(`  W3 rule fights (avg HP lost / survival): ${ruleLines.join(' | ')}`);
  const fails = [];
  if (!SL) heroRates.forEach((r, i) => { if (r < 0.20 || r > 0.30) fails.push(`${HERO_IDS[i]} winrate ${pct(r)} outside 20–30%`); });
  if (!SL && Math.max(...heroRates) - Math.min(...heroRates) > 0.08) fails.push(`hero parity spread ${pct(Math.max(...heroRates) - Math.min(...heroRates))} > 8 pts`);
  if (!SL && Math.max(...stratRates) - Math.min(...stratRates) > 0.10) fails.push(`strategy spread ${pct(Math.max(...stratRates) - Math.min(...stratRates))} > 10 pts`);
  const mf = median(all.turnsBy.fight), me = median(all.turnsBy.elite), mb = median(all.turnsBy.boss);
  if (mf < 3 || mf > 6) fails.push(`median normal fight ${mf} turns (3–6)`);
  if (me < 6 || me > 10) fails.push(`median elite ${me} turns (6–10)`);
  if (mb < 8 || mb > 14) fails.push(`median boss ${mb} turns (8–14)`);
  if (mean(all.sassPerW3) >= 1.5) fails.push(`Sass per W3 fight ${mean(all.sassPerW3).toFixed(2)} ≥ 1.5`);
  if (dominant.length) fails.push(`dominant picks: ${dominant.join('; ')}`);
  if (starterFails.length) fails.push(`starter decks lose W1 normals: ${starterFails.length}`);
  if (ruleFail.length) fails.push(`Tea Party Rule hard-counters: ${ruleFail.join('; ')}`);
  if (topDeaths.length && topDeaths[0][1] / deathTotal > 0.35) fails.push(`death spike: ${topDeaths[0][0]} ${pct(topDeaths[0][1] / deathTotal)} > 35%`);
  if (!SL && all.winTurns.length && (estMin < 30 || estMin > 45)) fails.push(`run length est ${estMin.toFixed(1)} min outside 30–45`);
  P(fails.length ? `RAILS: ${fails.length} FAIL\n  - ${fails.join('\n  - ')}` : 'RAILS: ALL CLEAR');
  console.log(out.join('\n'));
  process.exitCode = fails.length ? 1 : 0;
}
