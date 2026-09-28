// Rolfe Legends 4 — pure combat engine (no DOM). Slay-the-Spire rules kept
// (3 ⚡, draw 5, block expires, telegraphed intents, exhaust, innate) with RL4's
// new systems: Wyatt's Momentum, Aaron's Big Hammer, Liam's Potty meter + FLUSH!,
// the Squishy meter, the Nuh-Uh Shield, Tea Party Rules + Sass, stickers, Arena waves.
// Rules clarifications from DESIGN.md §13 are implemented literally and tested.

import { CARDS, cardInfo, makeCard, HAMMER_ID, FLUSH_BASE, FLUSH_BLOCK, POTTY_MAX } from './cards.js';
import { ENEMIES } from './enemies.js';
import { wouldBreakRule, breaksAtEndTurn, SASS_CAP } from './rules.js';

export const HAND_SIZE = 5;
export const ENERGY_BASE = 3;
export const MAX_HAND = 10;
export const INNATE_CAP = 5;

// ---------- Sass Levels (post-win ascension) — each level stacks ----------
export const SASS_LEVELS = [
  null,
  'Enemies have 8% more health.',
  'Tough fights hit 10% harder.',
  'Tough fights have 12% more health.',
  'Cousin bosses have 10% more health.',
  'After a cousin boss you heal half instead of all the way.',
  'Normal enemies hit 10% harder.',
  'Shops cost 15% more, and money pets earn 1 less coin.',
  'Start the run with 5 less max HP.',
  'Rest spots heal 20% instead of 30%.',
  'Cousin bosses hit 10% harder.',
];
function hpMult(state, def) {
  const L = state.sassLevel || 0;
  let m = 1;
  if (L >= 1) m *= 1.08;
  if (L >= 3 && def.elite && !def.boss) m *= 1.12;
  if (L >= 4 && def.boss) m *= 1.10;
  return m;
}
function dmgMult(state, e) {
  const L = state.sassLevel || 0;
  let m = 1;
  if (L >= 2 && e.isElite && !e.isBoss) m *= 1.10;
  if (L >= 6 && !e.isElite && !e.isBoss) m *= 1.10;
  if (L >= 10 && e.isBoss) m *= 1.10;
  return m;
}

// ---------- damage math ----------
export function attackValue(base, attacker) {
  let d = base + (attacker.pumped || 0);
  if ((attacker.wobbly || 0) > 0) d = Math.floor(d * 0.75);
  return Math.max(0, d);
}
function incomingMult(target) { return (target.wideOpen || 0) > 0 ? 1.5 : 1; }

export function targetable(state, e) {
  if (!e || e.hp <= 0 || e.gone || e.dissolved) return false;
  if (e.def && e.def.name && e.key === 'teddy_in_a_tiara' && livingEnemies(state).some((g) => g.def.guest)) return false;
  return true;
}
export function livingEnemies(state) {
  return state.enemies.filter((e) => e.hp > 0 && !e.gone);
}
export function targetableEnemies(state) {
  return livingEnemies(state).filter((e) => targetable(state, e));
}

// Deal damage. `fromHero` marks hero-sourced damage (cards, FLUSH!) for Squishy.
// Returns HP actually lost. Every resolved packet is logged for per-hit floaties.
export function dealDamage(state, target, amount, { attacker = null, isAttack = true, src = null, pierce = false, fromHero = false } = {}) {
  if (!target || target.hp <= 0 || target.gone) return 0;
  const tIdx = target === state.hero ? 'hero' : state.enemies.indexOf(target);
  if (target !== state.hero && !targetable(state, target)) {
    state.log.push({ t: 'immune', target: tIdx, src });
    return 0;
  }
  const heroSide = fromHero || attacker === state.hero;
  // a HIT is each positive attack packet, including a fully absorbed one (§13)
  if (heroSide && isAttack && amount > 0 && target !== state.hero && target.onHit) target.onHit(target, state);
  let dmg = Math.floor(amount * (isAttack ? incomingMult(target) : 1));
  let broke = false;
  // Nuh-Uh Shield: absorbs first, keeps its depletion across turns, excess passes
  if (target.shield > 0 && dmg > 0) {
    const a = Math.min(target.shield, dmg);
    target.shield -= a; dmg -= a;
    state.log.push({ t: 'shield', target: tIdx, amount: a, left: target.shield });
    if (target.shield <= 0) broke = true;
  }
  // Squishy meter: the first N hero damage each turn is squished
  if (heroSide && target.squishy && (target.squishLeft || 0) > 0 && dmg > 0) {
    const a = Math.min(target.squishLeft, dmg);
    target.squishLeft -= a; dmg -= a;
    state.log.push({ t: 'squished', target: tIdx, amount: a, left: target.squishLeft });
  }
  const absorbed = pierce ? 0 : Math.min(target.block || 0, dmg);
  target.block = (target.block || 0) - absorbed;
  dmg -= absorbed;
  state.log.push({ t: dmg > 0 ? 'dmg' : (absorbed > 0 ? 'blocked' : 'miss'), target: tIdx, amount: dmg, absorbed, src });
  if (target !== state.hero && heroSide) target.state.hitThisTurn = true;
  if (dmg > 0) {
    const before = target.hp;
    target.hp = Math.max(0, target.hp - dmg);
    if (target.onDamaged) target.onDamaged(target, state, dmg);
    if (target === state.hero) {
      state.hpLostThisFight = (state.hpLostThisFight || 0) + dmg;
      if (target.hp <= 0 && !state.killedBy) {
        state.killedBy = attacker && attacker !== state.hero && attacker.name
          ? { name: attacker.name, emoji: attacker.emoji, artKey: attacker.artKey } : { src: src || 'oops' };
      }
      // Glitter Jar: first time below half HP each fight → 10 Block
      if (hasRelic(state, 'glitter_jar') && !state.flags.glitterJar && before >= target.maxHp / 2 && target.hp < target.maxHp / 2 && target.hp > 0) {
        state.flags.glitterJar = true; target.block += 10; relicProc(state, 'glitter_jar');
      }
    }
  }
  if (broke) {
    applyStatus(state, target, 'wideOpen', 2);
    state.log.push({ t: 'shieldBreak', target: tIdx });
  }
  if (target.hp <= 0 && target !== state.hero) handleEnemyDeath(state, target);
  checkCombatEnd(state);
  return dmg;
}

function handleEnemyDeath(state, enemy) {
  if (enemy.deathHandled) return;
  enemy.deathHandled = true;
  // a stolen card comes home when the Closet Monster goes down
  if (enemy.state.held) { returnHeld(state, enemy); }
  if (enemy.onDeath) enemy.onDeath(enemy, state);
}

export function checkCombatEnd(state) {
  if (state.over) return;
  if (state.hero.hp <= 0) { state.hero.hp = 0; state.over = true; state.won = false; return; }
  if (livingEnemies(state).length === 0) {
    if (state.waves && state.waves.length) { nextWave(state); return; }
    state.over = true; state.won = true;
  }
}

function nextWave(state) {
  const w = state.waves.shift();
  state.waveNo = (state.waveNo || 1) + 1;
  for (const k of w.enemies) spawnEnemy(state, k);
  for (const e of livingEnemies(state)) if (!e.intent) setIntent(state, e);
  if (w.rule !== undefined && w.rule !== state.rule) { state.nextRule = w.rule; } // announced; applies at the next turn
  state.log.push({ t: 'wave', n: state.waveNo, rule: w.rule || null });
}

// ---------- statuses ----------
export function applyStatus(state, target, k, n) {
  if (!target || (target.hp <= 0 && target !== state.hero)) return;
  if (k === 'pumped') { target.pumped = (target.pumped || 0) + n; return; }
  target[k] = Math.max(0, (target[k] || 0) + n);
}
function tickDebuffs(c) {
  for (const k of ['wobbly', 'wideOpen']) if ((c[k] || 0) > 0) c[k] -= 1;
}

// ---------- deck & hand ----------
export function drawCards(state, n) {
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= MAX_HAND) return;
    if (state.draw.length === 0) {
      if (state.discard.length === 0) return;
      state.draw = state.rng.shuffle(state.discard);
      state.discard = [];
    }
    const c = state.draw.pop();
    state.hand.push(c);
    (state.lastDrawn || (state.lastDrawn = [])).push(c.uid);
  }
}

function removeFromHand(state, inst) {
  const i = state.hand.indexOf(inst);
  if (i >= 0) state.hand.splice(i, 1);
}

// Sass: fight-only junk, at most 3 at a time, shuffled into the draw pile.
export function sassCount(state) {
  return [...state.hand, ...state.draw, ...state.discard].filter((c) => c.id === 'sass').length;
}
export function addSass(state, why = 'rule') {
  if (sassCount(state) >= SASS_CAP) { state.log.push({ t: 'sassCapped', why }); return false; }
  const c = makeCard('sass');
  state.draw.splice(state.rng.int(state.draw.length + 1), 0, c);
  state.sassAdded = (state.sassAdded || 0) + 1;
  state.log.push({ t: 'sass', why });
  return true;
}
export function canSaySorry(state, inst) {
  return inst && inst.id === 'sass' && state.hand.includes(inst) && state.hero.energy >= 1 && !state.over && state.phase !== 'enemy';
}
export function saySorry(state, inst) {
  if (!canSaySorry(state, inst)) return false;
  state.hero.energy -= 1;
  removeFromHand(state, inst);
  state.log.push({ t: 'sorry' });
  return true;
}

// ---------- treasures (combat hooks) ----------
export function hasRelic(state, id) { return state.relics.includes(id); }
function relicProc(state, id) { state.log.push({ t: 'relic', id }); }

// ---------- enemy spawning ----------
export function spawnEnemy(state, key, opts = {}) {
  const def = ENEMIES[key];
  if (!def) throw new Error(`unknown enemy: ${key}`);
  const mult = hpMult(state, def);
  const e = {
    key, name: def.name, emoji: def.emoji, artKey: key,
    maxHp: Math.round((opts.hp ?? state.rng.range(def.hp[0], def.hp[1])) * mult),
    block: 0, pumped: 0, wobbly: 0, wideOpen: 0, shield: 0, squishy: 0, squishLeft: 0,
    gone: false, dissolved: false, state: {}, isElite: !!def.elite, isBoss: !!def.boss, hpMult: mult,
  };
  e.hp = e.maxHp;
  if (def.init) def.init(e, state);
  e.squishLeft = e.squishy;
  if (def.onDamaged) e.onDamaged = (self, st, dmg) => def.onDamaged(self, st, dmg);
  if (def.onDeath) e.onDeath = (self, st) => def.onDeath(self, st);
  if (def.onHit) e.onHit = (self, st) => def.onHit(self, st);
  e.def = def;
  state.enemies.push(e);
  // Bubble Wand greets newcomers too
  if (hasRelic(state, 'bubble_wand') && state.turn === 0) e.wobbly = (e.wobbly || 0) + 1;
  return e;
}

function setIntent(state, e) { e.intent = e.def.nextMove(e, state, state.rng); }

// ---------- combat setup ----------
// run: { hero, hp, maxHp, deck, relics, sassLevel } · encounter: { enemies, rule?, waves? }
export function startCombat(run, encounter, rng, { kind = 'fight' } = {}) {
  const enemyKeys = Array.isArray(encounter) ? encounter : encounter.enemies;
  const state = {
    rng, kind,
    hero: { isHero: true, hp: run.hp, maxHp: run.maxHp, block: 0, energy: 0, pumped: 0, wobbly: 0, wideOpen: 0, powers: {} },
    heroId: run.hero,
    enemies: [], draw: [], hand: [], discard: [], exhaust: [],
    relics: run.relics || [],
    turn: 0, over: false, won: false, phase: 'hero', queue: [], log: [], flags: {},
    cardsThisTurn: 0, attacksThisTurn: 0, bigAttacksThisTurn: 0, blockCardsThisTurn: 0, lastCardWasAttack: false,
    momentum: 0, potty: 0, doubleFlush: false, flushes: 0,
    hammer: { base: 12, bonus: 0, all: false, discountNext: 0, bounceNext: false },
    relayFree: [], slimed: [], coinsEarned: 0, sassAdded: 0,
    rule: Array.isArray(encounter) ? null : (encounter.rule || null), nextRule: null, rulesOff: false,
    waves: Array.isArray(encounter) ? null : (encounter.waves ? encounter.waves.map((w) => ({ ...w })) : null), waveNo: 1,
    sassLevel: run.sassLevel || 0,
    prevTurnLastAttack: 0, lastAttackDmgThisTurn: 0,
  };
  for (const k of enemyKeys) spawnEnemy(state, k);
  // the Big Hammer's base (upgrade + sticker) comes from the deck's hammer card
  const hammerCard = run.deck.find((c) => c.id === HAMMER_ID);
  if (hammerCard) {
    const info = cardInfo(hammerCard);
    state.hammer.base = (info.hammerBase || 12) + (info.fx[0].stickerDmg || 0);
  }
  // deck in: shuffle; innate cards (up to 5) surface on top — the Big Hammer first
  const deck = run.deck.map((c) => ({ ...c }));
  state.draw = rng.shuffle(deck);
  let innate = state.draw.filter((c) => cardInfo(c).innate);
  innate.sort((a, b) => (b.id === HAMMER_ID) - (a.id === HAMMER_ID));
  innate = innate.slice(0, INNATE_CAP);
  state.draw = state.draw.filter((c) => !innate.includes(c));
  state.draw.push(...innate.reverse()); // top of draw pile = end of array
  // combat-start treasures
  const h = state.hero;
  if (hasRelic(state, 'squishy_pillow')) { h.block += 8; relicProc(state, 'squishy_pillow'); }
  if (hasRelic(state, 'pinky_promise')) { h.pumped += 1; relicProc(state, 'pinky_promise'); }
  if (hasRelic(state, 'bubble_wand')) relicProc(state, 'bubble_wand');
  for (const e of livingEnemies(state)) setIntent(state, e);
  startHeroTurn(state);
  return state;
}

// ---------- turn flow ----------
export function startHeroTurn(state) {
  if (state.over) return;
  state.turn += 1;
  state.lastDrawn = [];
  const h = state.hero;
  if (state.turn > 1) h.block = 0;
  h.energy = ENERGY_BASE;
  state.cardsThisTurn = 0; state.attacksThisTurn = 0; state.bigAttacksThisTurn = 0; state.blockCardsThisTurn = 0;
  state.lastCardWasAttack = false; state.lastAttackDmgThisTurn = 0;
  state.momentum = h.powers.lightning_legs ? h.powers.lightning_legs : 0;
  state.hammer.discountNext = 0; state.hammer.bounceNext = false;
  state.relayFree = [];
  // Delilah's announced rule arrives now — never mid-turn
  if (state.nextRule && !state.rulesOff) { state.rule = state.nextRule; state.nextRule = null; state.log.push({ t: 'rule', rule: state.rule }); }
  for (const e of livingEnemies(state)) { e.squishLeft = e.squishy || 0; e.state.hitThisTurn = false; }
  // turn-start treasures
  if (hasRelic(state, 'stellas_crown')) { h.energy += 1; }
  if (state.turn === 1 && hasRelic(state, 'pink_car_keys')) { h.energy += 1; relicProc(state, 'pink_car_keys'); }
  if (hasRelic(state, 'juice_box_straw') && state.turn % 3 === 0) { h.energy += 1; relicProc(state, 'juice_box_straw'); }
  if (hasRelic(state, 'lucys_mega_squishy')) { h.block += 6; relicProc(state, 'lucys_mega_squishy'); }
  if (state.momentum >= 4) stopwatchCheck(state);
  drawCards(state, HAND_SIZE + (hasRelic(state, 'party_hat') ? 1 : 0));
}

function stopwatchCheck(state) {
  if (hasRelic(state, 'stopwatch') && !state.flags.stopwatch && state.momentum >= 4) {
    state.flags.stopwatch = true; state.hero.energy += 1; relicProc(state, 'stopwatch');
  }
}

// ---------- the Big Hammer ----------
export function hammerDamage(state) { return state.hammer.base + state.hammer.bonus; }

// ---------- the Potty meter ----------
export function addPotty(state, n) {
  if (n <= 0) return;
  state.potty += n;
  state.log.push({ t: 'potty', n, now: Math.min(POTTY_MAX, state.potty) });
  if (state.potty >= POTTY_MAX) {
    state.potty = 0; // reset BEFORE the flush resolves; overflow discarded (§13)
    flush(state);
  }
}
export function flush(state) {
  const times = state.doubleFlush ? 2 : 1;
  state.doubleFlush = false;
  for (let i = 0; i < times; i++) {
    if (state.over) break;
    state.flushes += 1;
    const dmg = FLUSH_BASE + (state.hero.powers.royal_throne || 0);
    state.log.push({ t: 'flush', n: i + 1, of: times, dmg });
    for (const e of targetableEnemies(state)) dealDamage(state, e, dmg, { isAttack: false, src: 'flush', fromHero: true });
    state.hero.block += FLUSH_BLOCK;
    if (state.hero.powers.big_kid_stickers) drawCards(state, state.hero.powers.big_kid_stickers);
    if (state.hero.powers.big_boy_undies) applyStatus(state, state.hero, 'pumped', state.hero.powers.big_boy_undies);
    if (hasRelic(state, 'sticker_chart') && !state.flags.stickerChart) {
      state.flags.stickerChart = true; state.coinsEarned += 5; relicProc(state, 'sticker_chart');
    }
  }
  checkCombatEnd(state);
}

// ---------- costs ----------
export function effectiveCost(state, inst) {
  const info = cardInfo(inst);
  if (info.cost === null) return null;
  let cost = info.cost;
  if (inst.id === HAMMER_ID) {
    if (state.hero.powers.titan_grip != null) cost = Math.min(cost, state.hero.powers.titan_grip);
    cost -= state.hammer.discountNext || 0;
  }
  if (info.momentumDiscount) cost -= Math.floor(state.momentum / info.momentumDiscount);
  if (state.slimed.includes(inst.uid) && !info.signature) cost += 1;
  if (state.relayFree.includes(inst.uid)) cost = 0;
  if (hasRelic(state, 'scrunchie') && !state.flags.scrunchie) cost = 0;
  cost = Math.max(0, cost);
  if (info.rainbow && !info.exhausts) cost = Math.max(1, cost); // §13 infinite guard
  return cost;
}

export function canPlay(state, inst) {
  if (state.over || state.phase === 'enemy') return false;
  const info = cardInfo(inst);
  if (!info || info.unplayable) return false;
  const spend = (info.fx || []).find((o) => o.pottySpend);
  if (spend && state.potty < spend.pottySpend.n) return false;
  if (cardNeedsTarget(info, state) && targetableEnemies(state).length === 0) return false;
  return state.hero.energy >= effectiveCost(state, inst);
}

export function cardNeedsTarget(info, state = null) {
  if (info.id === HAMMER_ID && state && state.hammer.all) return false;
  return (info.fx || []).some((op) => (op.dmg != null && !op.allEnemies) || op.hammerSwing || op.hammerTwice
    || (op.hammerHalf && op.hammerHalf.kind === 'dmg') || op.pottyDance != null || op.pottyAll != null
    || (op.status && op.status.target === 'target'));
}

// Damage a card would deal to one target right now (UI number + Tea Party Rules).
// Excludes the target's Wide Open (rules count the card's own number).
export function previewCardDamage(state, info) {
  const h = state.hero;
  let total = 0;
  const m = state.momentum + 1; // this card counts itself
  const walk = (fx, mom) => {
    for (const o of fx || []) {
      if (o.dmg != null) total += attackValue(o.dmg + (o.stickerDmg || 0) + (o.dmgPerMomentum || 0) * mom, h) * (o.times || 1);
      if (o.hammerSwing) total += attackValue(hammerDamage(state), h);
      if (o.hammerTwice) total += attackValue(hammerDamage(state) + (o.stickerDmg || 0), h) * 2;
      if (o.hammerHalf && o.hammerHalf.kind === 'dmg') total += attackValue(Math.floor(hammerDamage(state) / 2) + o.hammerHalf.plus + (o.stickerDmg || 0), h);
      if (o.pottyDance != null) total += attackValue(Math.floor(state.potty / 2) * o.pottyDance + (o.stickerDmg || 0), h);
      if (o.pottyAll != null) total += attackValue(state.potty * o.pottyAll + (o.stickerDmg || 0), h);
      if (o.ifMomentum && mom >= o.ifMomentum.n) walk(o.ifMomentum.fx, mom);
    }
  };
  walk(info.fx, m);
  return total;
}

// Would this card break the current Tea Party Rule? (UI glows it before play.)
export function cardBreaksRule(state, inst) {
  if (!state.rule || state.rulesOff) return false;
  const info = cardInfo(inst);
  return wouldBreakRule(state, info, info.type === 'attack' ? previewCardDamage(state, info) : 0);
}

// ---------- playing cards ----------
export function playCard(state, inst, target = null) {
  if (!canPlay(state, inst)) return false;
  const info = cardInfo(inst);
  if (cardNeedsTarget(info, state) && (!target || !targetable(state, target))) {
    target = targetableEnemies(state)[0] || null;
  }
  const breaks = cardBreaksRule(state, inst);
  const ruleDmg = info.type === 'attack' ? previewCardDamage(state, info) : 0;
  const cost = effectiveCost(state, inst);
  state.hero.energy -= cost;
  if (hasRelic(state, 'scrunchie') && !state.flags.scrunchie) { state.flags.scrunchie = true; relicProc(state, 'scrunchie'); }
  if (inst.id === HAMMER_ID) state.hammer.discountNext = 0;           // discount spent on this play only
  state.relayFree = state.relayFree.filter((u) => u !== inst.uid);   // relay: next play only
  removeFromHand(state, inst);
  state.lastDrawn = [];

  // counters (Momentum counts this card; rules read the counters BEFORE this card)
  state.cardsThisTurn += 1;
  state.momentum += 1;
  stopwatchCheck(state);
  if (info.type === 'attack') { state.attacksThisTurn += 1; if (ruleDmg > 12) state.bigAttacksThisTurn += 1; state.lastAttackDmgThisTurn = ruleDmg; }
  const isBlockCard = (info.fx || []).some((o) => o.block != null || o.pottySpend || o.hammerHalf?.kind === 'block');
  if (isBlockCard) state.blockCardsThisTurn += 1;
  state.lastCardWasAttack = info.type === 'attack';
  if (state.hero.powers.keep_moving && state.cardsThisTurn === 4) state.hero.block += state.hero.powers.keep_moving;
  state.log.push({ t: 'play', id: inst.id, uid: inst.uid });

  runEffects(state, info, inst, target);
  if (info.power) state.hero.powers[info.power] = info.pn ?? true;

  // where the card goes
  let bounced = false;
  if (inst.id === HAMMER_ID && state.flags.bounceNow) { state.flags.bounceNow = false; bounced = true; }
  if (info.type === 'power') { /* consumed */ }
  else if (bounced && state.hand.length < MAX_HAND) state.hand.push(inst);
  else if (info.exhausts) state.exhaust.push(inst);
  else state.discard.push(inst);

  if (breaks) addSass(state, 'rule');
  checkCombatEnd(state);
  return true;
}

function runEffects(state, info, inst, target) {
  const h = state.hero;
  const hit = (base, tgt) => {
    const v = attackValue(base, h);
    if (tgt) dealDamage(state, tgt, v, { attacker: h });
  };
  const allHit = (base) => { for (const e of targetableEnemies(state)) hit(base, e); };
  const walk = (fx) => {
    for (const op of fx || []) {
      if (state.over) break;
      if (op.dmg != null) {
        const base = op.dmg + (op.stickerDmg || 0) + (op.dmgPerMomentum || 0) * state.momentum;
        for (let t = 0; t < (op.times || 1); t++) {
          if (op.allEnemies) allHit(base);
          else { if (!targetable(state, target)) target = targetableEnemies(state)[0]; hit(base, target); }
        }
      }
      if (op.hammerSwing) {
        const d = hammerDamage(state);
        if (state.hammer.all) allHit(d); else { if (!targetable(state, target)) target = targetableEnemies(state)[0]; hit(d, target); }
        if (hasRelic(state, 'weight_belt') && !state.flags.weightBelt) { state.flags.weightBelt = true; h.block += 6; relicProc(state, 'weight_belt'); }
        if (h.powers.forged) { state.hammer.bonus += h.powers.forged; state.log.push({ t: 'forge', n: h.powers.forged, total: hammerDamage(state) }); }
        if (state.hammer.bounceNext) { state.hammer.bounceNext = false; state.flags.bounceNow = true; }
      }
      if (op.hammerTwice) {
        for (let t = 0; t < 2; t++) {
          if (!targetable(state, target)) target = targetableEnemies(state)[0];
          hit(hammerDamage(state) + (op.stickerDmg || 0), target);
        }
      }
      if (op.hammerHalf) {
        const v = Math.floor(hammerDamage(state) / 2) + (op.hammerHalf.plus || 0);
        if (op.hammerHalf.kind === 'block') h.block += v;
        else { if (!targetable(state, target)) target = targetableEnemies(state)[0]; hit(v + (op.stickerDmg || 0), target); }
      }
      if (op.hammerPlus) { state.hammer.bonus += op.hammerPlus; state.log.push({ t: 'forge', n: op.hammerPlus, total: hammerDamage(state) }); }
      if (op.hammerAll) state.hammer.all = true;
      if (op.hammerNextDiscount) state.hammer.discountNext = (state.hammer.discountNext || 0) + op.hammerNextDiscount;
      if (op.hammerBounce) state.hammer.bounceNext = true;
      if (op.block != null) h.block += op.block;
      if (op.draw) drawCards(state, op.draw);
      if (op.energy) h.energy += op.energy;
      if (op.status) {
        const { k, n, target: tg } = op.status;
        if (tg === 'self') applyStatus(state, h, k, n);
        else if (tg === 'all') for (const e of targetableEnemies(state)) applyStatus(state, e, k, n);
        else if (targetable(state, target)) applyStatus(state, target, k, n);
      }
      if (op.ifMomentum && state.momentum >= op.ifMomentum.n) walk(op.ifMomentum.fx);
      if (op.potty) addPotty(state, op.potty);
      if (op.pottySpend) { state.potty -= op.pottySpend.n; h.block += op.pottySpend.block; state.log.push({ t: 'potty', n: -op.pottySpend.n, now: state.potty }); }
      if (op.pottyDance != null) { if (!targetable(state, target)) target = targetableEnemies(state)[0]; hit(Math.floor(state.potty / 2) * op.pottyDance + (op.stickerDmg || 0), target); }
      if (op.pottyAll != null) {
        const p = state.potty; state.potty = 0;
        state.log.push({ t: 'potty', n: -p, now: 0 });
        if (!targetable(state, target)) target = targetableEnemies(state)[0];
        hit(p * op.pottyAll + (op.stickerDmg || 0), target);
      }
      if (op.doubleFlush) state.doubleFlush = true;
      if (op.emergency != null && state.potty >= op.emergency) { state.potty = 0; flush(state); }
      if (op.discardHandDraw) {
        const n = state.hand.length;
        state.discard.push(...state.hand); state.hand = [];
        drawCards(state, n);
      }
      if (op.relay) {
        const before = state.hand.length;
        drawCards(state, op.relay);
        for (const c of state.hand.slice(before)) state.relayFree.push(c.uid);
      }
    }
  };
  walk(info.fx);
}

// ---------- enemy-side card tricks (Closet Monster, Mesh Squish Ball, Lucy) ----------
// Targets are chosen in beginEnemyPhase BEFORE the hand is discarded (§13).
function pickHandTargets(state) {
  for (const e of livingEnemies(state)) {
    const it = e.intent;
    if (!it || !it.pickHand) continue;
    const pool = state.hand.filter((c) => {
      const info = cardInfo(c);
      if (!info || info.signature || info.noSteal || info.unplayable) return false;
      if (it.pickHand === 'slime') return info.cost !== null && !state.slimed.includes(c.uid);
      return true;
    });
    it.handTarget = pool.length ? state.rng.pick(pool).uid : null;
  }
}
function findCard(state, uid) {
  for (const pile of ['hand', 'draw', 'discard']) {
    const i = state[pile].findIndex((c) => c.uid === uid);
    if (i >= 0) return { pile, i, card: state[pile][i] };
  }
  return null;
}
export function heroStealCard(state, e) {
  const uid = e.intent && e.intent.handTarget;
  if (uid == null) return;
  const f = findCard(state, uid);
  if (!f) return;
  state[f.pile].splice(f.i, 1);
  e.state.held = f.card; e.state.heldTurns = 2;
  state.log.push({ t: 'steal', id: f.card.id, enemy: state.enemies.indexOf(e) });
}
function returnHeld(state, e) {
  const c = e.state.held;
  e.state.held = null;
  if (c) { state.discard.push(c); state.log.push({ t: 'returned', id: c.id }); }
}
export function slimeCard(state, e) {
  const uid = e.intent && e.intent.handTarget;
  if (uid == null || state.slimed.includes(uid)) return;
  state.slimed.push(uid);
  const f = findCard(state, uid);
  state.log.push({ t: 'slimed', id: f ? f.card.id : null });
}
export function setRuleNext(state, rule) {
  if (state.rulesOff) return;
  state.nextRule = rule;
}

// ---------- enemy phase (steppable for the UI; endTurn runs it synchronously) ----------
export function beginEnemyPhase(state) {
  if (state.over || state.phase === 'enemy') return false;
  const h = state.hero;
  // Clean Your Plate is judged at END TURN
  if (!state.rulesOff && breaksAtEndTurn(state)) addSass(state, 'rule');
  state.prevTurnLastAttack = state.lastAttackDmgThisTurn || 0;
  pickHandTargets(state);
  tickDebuffs(h);
  // discard hand — Smiley-stickered cards you didn't play stay
  const keep = state.hand.filter((c) => cardInfo(c).retain);
  state.discard.push(...state.hand.filter((c) => !keep.includes(c)));
  state.hand = keep;
  state.phase = 'enemy';
  for (const e of livingEnemies(state)) e.block = 0; // group-wide, before anyone acts (StS)
  state.prevTurnAttacked = (state.attacksThisTurn || 0) > 0;
  state.queue = [...state.enemies]; // snapshot: summons act NEXT cycle (§13)
  if (state.over) { state.phase = 'hero'; state.queue = []; }
  return true;
}

export function stepEnemyAction(state) {
  while (state.phase === 'enemy' && state.queue.length) {
    if (state.over) break;
    const e = state.queue.shift();
    if (e.gone || e.hp <= 0) continue;
    if (e.def.beforeAct) e.def.beforeAct(e, state);
    // a held (stolen) card comes back after its turns are up
    if (e.state.held) { e.state.heldTurns -= 1; if (e.state.heldTurns <= 0) returnHeld(state, e); }
    executeIntent(state, e);
    if (e.def.afterAct) e.def.afterAct(e, state);
    tickDebuffs(e);
    if (!state.over && e.hp > 0) setIntent(state, e);
    return e;
  }
  state.phase = 'hero';
  state.queue = [];
  checkCombatEnd(state);
  if (!state.over) startHeroTurn(state);
  return null;
}

export function endTurn(state) {
  if (!beginEnemyPhase(state)) return;
  while (state.phase === 'enemy') stepEnemyAction(state);
}

function executeIntent(state, e) {
  const it = e.intent;
  if (!it) return;
  if (it.pre) it.pre(state, e);
  if (it.dmg != null) {
    const mult = dmgMult(state, e);
    for (let t = 0; t < (it.times || 1); t++) {
      if (state.over) break;
      dealDamage(state, state.hero, Math.floor(attackValue(it.dmg, e) * mult), { attacker: e });
    }
  }
  if (it.block) e.block += it.block;
  if (it.fn && !state.over) it.fn(state, e);
}

// What the UI shows for an attack intent — matches what will actually hit.
export function intentPreview(state, e) {
  const it = e.intent;
  if (!it || it.dmg == null) return null;
  const per = Math.floor(Math.floor(attackValue(it.dmg, e) * dmgMult(state, e)) * incomingMult(state.hero));
  return { per, times: it.times || 1 };
}
