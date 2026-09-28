// Rolfe Legends 4 — unit tests. Run: node test/test.mjs
// Covers the engine rules (DESIGN.md §13 literally), the economy, maps, saves,
// the no-port rule, card text, and the shared-origin service worker.
import { makeRng } from '../js/rng.js';
import { CARDS, HEROES, makeCard, cardInfo, draftPool, nValue, HAMMER_ID } from '../js/cards.js';
import { STICKERS, STICKER_IDS, canSticker } from '../js/stickers.js';
import { TREASURES } from '../js/treasures.js';
import { PETS, petEarn } from '../js/pets.js';
import { ENEMIES } from '../js/enemies.js';
import { TEA_RULES, RULE_IDS } from '../js/rules.js';
import { WORLDS } from '../js/worlds.js';
import { cardText, plainText } from '../js/text.js';
import * as C from '../js/combat.js';
import * as R from '../js/run.js';
import { generateWorldMap, validateMap, allPaths, BOSS_ID } from '../js/map.js';
import { readFileSync, existsSync } from 'fs';
import vm from 'vm';

let passed = 0, failed = 0;
const fails = [];
function ok(cond, msg) { if (cond) passed++; else { failed++; fails.push(msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

function combatVs(keys, { hero = 'aaron', seed = 7, run = null, rule = null, waves = null } = {}) {
  const r = run || R.newRun(hero, seed);
  return { run: r, st: C.startCombat(r, { enemies: keys, rule, waves }, makeRng(seed)) };
}
function forceHand(st, ids, { stickers = {} } = {}) {
  st.hand = ids.map((id) => makeCard(id, false, stickers[id] || null));
  st.draw = []; st.discard = [];
  return st.hand;
}
const card = (st, id) => st.hand.find((c) => c.id === id);

// ---------- data integrity ----------
{
  for (const [id, c] of Object.entries(CARDS)) {
    ok(c.name && c.emoji && c.type && c.rarity && c.src, `card ${id} has name/emoji/type/rarity/src`);
    ok(c.type === 'status' || typeof c.cost === 'number', `card ${id} cost is a number`);
    const t = plainText(cardInfo(makeCard(id)));
    ok(!/\{[a-z]+\}/.test(t) && !t.includes('?'), `card ${id} text resolves: "${t}"`);
    if (c.up) {
      const tu = plainText(cardInfo(makeCard(id, true)));
      ok(!/\{[a-z]+\}/.test(tu) && !tu.includes('?'), `card ${id}+ text resolves: "${tu}"`);
    }
    // plain words: no StS jargon on the card face (Polish floor 15)
    ok(!/\b(Strength|Vulnerable|Weak|Exhaust|Dexterity|Frail|Poison|Innate|Retain|Ethereal)\b/.test(t), `card ${id} uses plain words: "${t}"`);
  }
  for (const h of Object.keys(HEROES)) {
    eq(HEROES[h].starter.length, 10, `${h} starter deck is 10 cards`);
    eq(draftPool(h).length, 15, `${h} reward pool is 15 cards`);
    const pool = draftPool(h).map((id) => CARDS[id].rarity);
    eq(pool.filter((r) => r === 'common').length, 6, `${h}: 6 commons`);
    eq(pool.filter((r) => r === 'uncommon').length, 6, `${h}: 6 uncommons`);
    eq(pool.filter((r) => r === 'rare').length, 3, `${h}: 3 rares`);
    ok(TREASURES[HEROES[h].relic] && TREASURES[HEROES[h].relic].starter === h, `${h} starter treasure exists`);
  }
  for (const [k, e] of Object.entries(ENEMIES)) ok(e.name && e.emoji && e.hp && typeof e.nextMove === 'function', `enemy ${k} well-formed`);
  for (const w of [1, 2, 3]) {
    const W = WORLDS[w];
    for (const pool of Object.values(W.encounters)) for (const g of pool) for (const k of g) ok(ENEMIES[k], `W${w} encounter enemy ${k} exists`);
    for (const wave of W.arena.waves) for (const k of wave.enemies) ok(ENEMIES[k], `W${w} arena enemy ${k} exists`);
  }
  eq(Object.keys(TEA_RULES).length, 5, 'five Tea Party Rules');
  eq(Object.keys(STICKERS).length, 6, 'six stickers');
}

// ---------- the no-port rule: nothing visible carries over from RL2/RL3 ----------
{
  const names = new Set();
  for (const f of ['cards', 'enemies', 'relics', 'events', 'pets']) {
    for (const repo of ['rolfe-legends-2', 'rolfe-legends-3']) {
      const p = `${process.env.HOME}/code/${repo}/js/${f}.js`;
      if (!existsSync(p)) continue;
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/name:\s*'([^']+)'/g)) names.add(m[1].toLowerCase().replace(/\+$/, ''));
      for (const m of src.matchAll(/name:\s*"([^"]+)"/g)) names.add(m[1].toLowerCase());
    }
  }
  ok(names.size > 100, `no-port test read the predecessors (${names.size} names)`);
  const heroNames = new Set(Object.values(HEROES).map((h) => h.name.toLowerCase()));
  const ours = [
    ...Object.values(CARDS).map((c) => c.name), ...Object.values(ENEMIES).map((e) => e.name),
    ...Object.values(TREASURES).map((t) => t.name), ...Object.values(PETS).map((p) => p.name), ...Object.values(STICKERS).map((s) => s.name),
  ];
  const clashes = ours.filter((n) => names.has(n.toLowerCase()) && !heroNames.has(n.toLowerCase()));
  eq(clashes.join(', '), '', 'no RL4 card/enemy/treasure/pet/sticker name matches RL2/RL3 (no-port rule)');
}

// ---------- Momentum ----------
{
  const { st } = combatVs(['pink_pony'], { hero: 'wyatt' });
  forceHand(st, ['quick_pass', 'quick_pass', 'dash_attack']);
  st.hero.energy = 3;
  C.playCard(st, card(st, 'quick_pass'), st.enemies[0]);
  C.playCard(st, card(st, 'quick_pass'), st.enemies[0]);
  eq(st.momentum, 2, 'Momentum counts cards played this turn');
  const hp = st.enemies[0].hp;
  C.playCard(st, card(st, 'dash_attack'), st.enemies[0]);
  eq(hp - st.enemies[0].hp, 3 + 2 * 3, 'Dash Attack: 3 + 2 per Momentum (this card counts → 3)');
  C.endTurn(st);
  eq(st.momentum, 0, 'Momentum resets at the start of your turn');
}
{ // Stopwatch triggers at 4 (§13), once per fight
  const { st } = combatVs(['pink_pony'], { hero: 'wyatt' });
  forceHand(st, ['quick_pass', 'quick_pass', 'quick_pass', 'quick_pass', 'quick_pass']);
  st.hero.energy = 0;
  for (let i = 0; i < 4; i++) C.playCard(st, st.hand[0], st.enemies[0]);
  eq(st.hero.energy, 1, 'Stopwatch: 4th card of a turn → +1 ⚡');
  C.playCard(st, st.hand[0], st.enemies[0]);
  eq(st.hero.energy, 1, 'Stopwatch: only once per fight');
}
{ // Relay Race: the drawn cards' NEXT play only costs 0 (Cartwheel loop blocked)
  const { st } = combatVs(['pink_pony'], { hero: 'wyatt' });
  forceHand(st, ['relay_race']);
  st.draw = [makeCard('cartwheel'), makeCard('cartwheel')];
  st.hero.energy = 1;
  C.playCard(st, card(st, 'relay_race'));
  const cw = st.hand.filter((c) => c.id === 'cartwheel');
  eq(cw.length, 2, 'Relay Race drew 2');
  eq(C.effectiveCost(st, cw[0]), 0, 'relay card costs 0 for its next play');
  let plays = 0;
  for (let i = 0; i < 40; i++) {
    const c = st.hand.find((x) => x.id === 'cartwheel' && C.canPlay(st, x));
    if (!c) break;
    C.playCard(st, c); plays++;
  }
  ok(plays <= 2, `Relay + Cartwheel does not loop (plays ${plays})`);
}
{ // Photo Finish with Rainbow never costs 0 (two Rainbow Finishes can't alternate forever)
  const { st } = combatVs(['stella'], { hero: 'wyatt' });
  const pf = forceHand(st, ['photo_finish', 'photo_finish'], { stickers: { photo_finish: 'rainbow' } });
  st.momentum = 8;
  eq(C.effectiveCost(st, pf[0]), 1, 'Rainbow non-exhaust card has min effective cost 1');
}

// ---------- the Big Hammer ----------
{
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  ok(st.hand.some((c) => c.id === HAMMER_ID), 'the Big Hammer starts every fight in hand');
  forceHand(st, [HAMMER_ID, 'sharpen', 'temper']);
  st.hero.energy = 10;
  C.playCard(st, card(st, 'sharpen'));
  C.playCard(st, card(st, 'temper'));
  eq(C.hammerDamage(st), 12 + 3 + 4, 'forge cards grow the hammer this fight');
  const hp = st.enemies[0].hp;
  C.playCard(st, card(st, HAMMER_ID), st.enemies[0]);
  eq(hp - st.enemies[0].hp, 19, 'hammer smashes for its current size');
  eq(st.hero.block, 4 + 3 + 6, 'Weight Belt: first hammer hit → +6 Block');
}
{ // Titan Grip + Deep Breath + Bounce Back: finite (§13)
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  forceHand(st, [HAMMER_ID, 'deep_breath', 'bounce_back']);
  st.hero.powers.titan_grip = 1;
  st.hero.powers.forged = 3;
  st.hero.energy = 3;
  C.playCard(st, card(st, 'deep_breath'));
  C.playCard(st, card(st, 'bounce_back'));
  let swings = 0;
  const dmgs = [];
  for (let i = 0; i < 40; i++) {
    const h = card(st, HAMMER_ID);
    if (!h || !C.canPlay(st, h)) break;
    const before = st.enemies[0].hp + st.enemies[0].block;
    C.playCard(st, h, st.enemies[0]); swings++;
    dmgs.push(before - st.enemies[0].hp - st.enemies[0].block);
  }
  ok(swings <= 3, `Titan Grip + Deep Breath + Bounce Back is finite (swings ${swings})`);
  eq(dmgs[0], 12, 'Forged on the Farm applies AFTER the swing (first swing 12)');
}
{ // the Big Hammer can't be stolen or Slimed
  const { st } = combatVs(['closet_monster'], { hero: 'aaron' });
  forceHand(st, [HAMMER_ID]);
  st.enemies[0].intent = { name: 'Try', kind: 'debuff', pickHand: 'steal', fn: (s, e) => C.heroStealCard(s, e) };
  C.endTurn(st);
  ok([...st.hand, ...st.draw, ...st.discard].some((c) => c.id === HAMMER_ID), 'Closet Monster never steals the Big Hammer');
}
{ // Legendary Swing: deals hammer twice, not a Hammer play (no forge)
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  forceHand(st, ['legendary_swing']);
  st.hero.powers.forged = 3; st.hero.energy = 3;
  C.playCard(st, card(st, 'legendary_swing'), st.enemies[0]);
  eq(st.hammer.bonus, 0, 'Legendary Swing does not trigger Forged on the Farm');
}

// ---------- the Potty meter + FLUSH! ----------
{
  const { st } = combatVs(['teenie_needoh', 'teenie_needoh'], { hero: 'liam' });
  st.potty = 8;
  forceHand(st, ['big_gulp']);
  st.hero.energy = 1;
  C.playCard(st, card(st, 'big_gulp'));
  eq(st.potty, 0, 'Potty resets to 0 on FLUSH! — overflow discarded (8+4 → 0)');
  eq(st.flushes, 1, 'one FLUSH!');
  ok(st.over && st.won, 'FLUSH! hits ALL enemies (15 each)');
}
{
  const { st } = combatVs(['stella'], { hero: 'liam' });
  st.potty = 9; st.doubleFlush = true;
  forceHand(st, ['wiggle']); st.hero.energy = 0;
  const hp = st.enemies[0].hp;
  C.playCard(st, card(st, 'wiggle'));
  eq(st.flushes, 2, 'Double Flush → two flush events');
  eq(hp - st.enemies[0].hp, 30, 'each flush deals 15');
  eq(st.doubleFlush, false, 'the doubling charge is consumed');
}
{
  const { st } = combatVs(['stella'], { hero: 'liam' });
  forceHand(st, ['hold_it']);
  st.potty = 3; st.hero.energy = 3;
  ok(!C.canPlay(st, card(st, 'hold_it')), 'Hold It! needs 4 Potty');
  st.potty = 4;
  ok(C.canPlay(st, card(st, 'hold_it')), 'Hold It! playable at 4');
}

// ---------- Squishy ----------
{
  const { st } = combatVs(['cube_needoh'], { hero: 'aaron' });
  const e = st.enemies[0];
  eq(e.squishLeft, 5, 'Cube NeeDoh starts with a squish meter of 5');
  forceHand(st, ['punch', 'punch']); st.hero.energy = 2;
  const hp = e.hp;
  C.playCard(st, card(st, 'punch'), e);
  eq(hp - e.hp, 1, 'first 5 damage this turn squished (6 → 1)');
  C.playCard(st, card(st, 'punch'), e);
  eq(hp - e.hp, 7, 'squish meter empty → full damage');
  C.endTurn(st);
  eq(e.squishLeft, 5, 'squish meter refills every turn');
}

// ---------- the Nuh-Uh Shield ----------
{
  const { st } = combatVs(['delilah'], { hero: 'aaron' });
  const d = st.enemies[0];
  d.shield = 20;
  C.dealDamage(st, d, 8, { attacker: st.hero });
  eq(d.shield, 12, 'shield absorbs damage');
  C.endTurn(st);
  eq(d.shield, 12, 'shield depletion persists across turns (no refill)');
  const hp = d.hp;
  C.dealDamage(st, d, 15, { attacker: st.hero });
  eq(d.shield, 0, 'shield breaks');
  eq(hp - d.hp, 3, 'excess damage passes through');
  eq(d.wideOpen, 2, 'breaking it makes her Wide Open 2 (after the hit)');
}

// ---------- Tea Party Rules + Sass ----------
{
  const { st } = combatVs(['spoon_knight'], { hero: 'aaron', rule: 'take_turns' });
  forceHand(st, ['punch', 'punch', 'punch']); st.hero.energy = 3;
  ok(!C.cardBreaksRule(st, card(st, 'punch')), 'first attack is fine');
  C.playCard(st, card(st, 'punch'), st.enemies[0]);
  ok(C.cardBreaksRule(st, card(st, 'punch')), 'second attack in a row would break Take Turns (card glows first)');
  C.playCard(st, card(st, 'punch'), st.enemies[0]);
  eq(C.sassCount(st), 1, 'breaking the rule adds one Sass');
  C.playCard(st, card(st, 'punch'), st.enemies[0]);
  eq(C.sassCount(st), 2, 'again');
  for (let i = 0; i < 5; i++) C.addSass(st);
  eq(C.sassCount(st), 3, 'Sass is capped at 3 at a time');
}
{ // Pinkies Out allows ONE big attack per turn (§13)
  const { st } = combatVs(['stella'], { hero: 'aaron', rule: 'pinkies_out' });
  forceHand(st, ['shoulder_charge', 'shoulder_charge']); st.hero.energy = 4;
  ok(!C.cardBreaksRule(st, card(st, 'shoulder_charge')), 'one big attack is allowed');
  C.playCard(st, card(st, 'shoulder_charge'), st.enemies[0]);
  ok(C.cardBreaksRule(st, card(st, 'shoulder_charge')), 'the second big attack breaks it');
}
{ // triggered damage never breaks a rule
  const { st } = combatVs(['stella'], { hero: 'liam', rule: 'pinkies_out' });
  st.bigAttacksThisTurn = 1; st.potty = 9;
  forceHand(st, ['wiggle']); st.hero.energy = 0;
  C.playCard(st, card(st, 'wiggle'));
  eq(C.sassCount(st), 0, 'FLUSH! (triggered) never breaks Pinkies Out');
}
{ // Say Sorry removes a Sass; Sass is fight-only (never in the run deck)
  const { run, st } = combatVs(['stella'], { hero: 'aaron', rule: 'inside_voices' });
  const s = makeCard('sass'); st.hand = [s]; st.hero.energy = 1;
  ok(C.saySorry(st, s), 'Say Sorry works');
  eq(st.hero.energy, 0, 'Say Sorry costs 1 ⚡');
  ok(!run.deck.some((c) => c.id === 'sass'), 'Sass never enters the run deck');
}
{ // Delilah announces the next rule; it changes at the START of your turn, never mid-turn
  const { st } = combatVs(['delilah'], { hero: 'wyatt', rule: 'take_turns' });
  C.setRuleNext(st, 'inside_voices');
  eq(st.rule, 'take_turns', 'announced rule does not apply mid-turn');
  C.endTurn(st);
  eq(st.rule, 'inside_voices', 'announced rule applies at the start of your next turn');
}
{ // Delilah TANTRUM: phase 2 on "death", rules off
  const { st } = combatVs(['delilah'], { hero: 'aaron', rule: 'take_turns' });
  const d = st.enemies[0];
  C.dealDamage(st, d, 9999, { attacker: st.hero });
  ok(!st.over && d.hp > 0 && d.state.phase === 2, 'Delilah re-forms into TANTRUM');
  eq(st.rule, null, 'TANTRUM: no more rules');
  ok(st.enemies.some((e) => e.key === 'rude_scone') && st.enemies.some((e) => e.key === 'snooty_teacup'), 'guests join the tantrum');
}

// ---------- enemies: tricks ----------
{ // Closet Monster picks its card BEFORE the discard and returns it after 2 turns
  const { st } = combatVs(['closet_monster'], { hero: 'wyatt' });
  const m = st.enemies[0];
  forceHand(st, ['kick', 'dodge']);
  m.intent = { name: 'Try It On!', kind: 'debuff', pickHand: 'steal', fn: (s, e) => C.heroStealCard(s, e) };
  C.endTurn(st);
  ok(m.state.held, 'Closet Monster took a card from the hand');
  const heldId = m.state.held.id;
  C.endTurn(st); C.endTurn(st);
  ok(!m.state.held && [...st.hand, ...st.draw, ...st.discard].some((c) => c.id === heldId), 'the card comes back after 2 turns');
}
{ // summons act next cycle
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  const s = st.enemies[0];
  s.state.outfit = 2; s.intent = s.def.nextMove(s, st, st.rng); // Tiara → summon
  const hp0 = st.hero.hp + st.hero.block;
  st.hand = []; C.endTurn(st);
  ok(st.enemies.some((e) => e.key === 'barbie_guard'), 'Stella called a guard');
  eq(st.hero.hp + st.hero.block >= hp0 - 0, true, 'a fresh summon does not act on the turn it arrives');
}
{ // sugar cubes: one is always hittable
  const { st } = combatVs(['sugar_cube', 'sugar_cube'], { hero: 'aaron' });
  for (let t = 0; t < 6; t++) {
    ok(C.targetableEnemies(st).length >= 1, `sugar cubes: someone is hittable (turn ${t})`);
    st.hand = []; C.endTurn(st);
  }
}
{ // Teddy is immune while guests are up
  const { st } = combatVs(['bunny_guest', 'teddy_in_a_tiara', 'dino_guest'], { hero: 'aaron' });
  const teddy = st.enemies.find((e) => e.key === 'teddy_in_a_tiara');
  const hp = teddy.hp;
  C.dealDamage(st, teddy, 20, { attacker: st.hero });
  eq(teddy.hp, hp, 'Teddy takes no damage while guests are up');
}
{ // Makeover Mirror copies your previous turn's last attack card (snapshot, max 15)
  const { st } = combatVs(['makeover_mirror'], { hero: 'aaron' });
  forceHand(st, ['uppercut']); st.hero.energy = 1;
  C.playCard(st, card(st, 'uppercut'), st.enemies[0]);
  C.endTurn(st);
  eq(st.enemies[0].intent.dmg, 9, 'Mirror shows the Uppercut it will copy (9)');
}

// ---------- the Codex code-review fixes (Sun 2026-09-27) — each pinned ----------
{ // #6 FLUSH! (not an attack) never triggers King NeeDoh's grow-on-hit
  const { st } = combatVs(['king_needoh'], { hero: 'liam' });
  st.potty = 9; forceHand(st, ['wiggle']); st.hero.energy = 0;
  C.playCard(st, card(st, 'wiggle'));
  eq(st.enemies[0].pumped || 0, 0, '#6 FLUSH! does not count as a hit on King NeeDoh');
  forceHand(st, ['toddle']); st.hero.energy = 1;
  C.playCard(st, card(st, 'toddle'), st.enemies[0]);
  eq(st.enemies[0].pumped, 1, '#6 an attack card still does');
}
{ // #3 killing the solid sugar cube solidifies its twin at once; no targeted card is charged without a target
  const { st } = combatVs(['sugar_cube', 'sugar_cube'], { hero: 'aaron' });
  const [a, b] = st.enemies;
  const solid = a.dissolved ? b : a;
  const other = solid === a ? b : a;
  ok(other.dissolved, '#3 setup: one twin dissolved');
  C.dealDamage(st, solid, 999, { attacker: st.hero });
  ok(!other.dissolved && C.targetableEnemies(st).length === 1, '#3 the surviving twin is hittable immediately');
  const { st: s2 } = combatVs(['sugar_cube'], { hero: 'aaron' });
  s2.enemies[0].dissolved = true;
  forceHand(s2, ['punch']); s2.hero.energy = 1;
  ok(!C.canPlay(s2, card(s2, 'punch')), '#3 a targeted card with no legal target is not playable (no energy lost)');
}
{ // #4 an Arena wave's new rule arrives at the next turn, never mid-turn
  const run = R.newRun('aaron', 5); run.world = 3; run.coins = 999;
  const enc = R.enterArena(run);
  const st = C.startCombat(run, enc, makeRng(3), { kind: 'arena' });
  const r0 = st.rule;
  for (const e of C.livingEnemies(st)) C.dealDamage(st, e, 999, { attacker: st.hero });
  eq(st.rule, r0, '#4 the rule does not change mid-turn when wave 2 arrives');
  ok(st.nextRule && st.nextRule !== r0, '#4 wave 2\'s rule is announced for next turn');
  C.endTurn(st);
  eq(st.rule, 'pinkies_out', '#4 and applies at the start of the next turn');
}
{ // #5 the Closet Monster never takes a hero's starter mechanic card
  const { st } = combatVs(['closet_monster'], { hero: 'liam' });
  forceHand(st, ['sippy_cup']);
  st.enemies[0].intent = { name: 'Try', kind: 'debuff', pickHand: 'steal', fn: (s, e) => C.heroStealCard(s, e) };
  C.endTurn(st);
  ok(!st.enemies[0].state.held, '#5 Apple Juice (Liam\'s meter card) is never stolen');
}
{ // Astra #6: theft protection is not slime immunity — Ooze can still slime Apple Juice
  const { st } = combatVs(['mesh_squish_ball'], { hero: 'liam' });
  forceHand(st, ['sippy_cup']);
  const uid = st.hand[0].uid;
  st.enemies[0].intent = { name: 'Ooze', kind: 'debuff', pickHand: 'slime', fn: (s, e) => C.slimeCard(s, e) };
  C.endTurn(st);
  ok(st.slimed.includes(uid), 'Astra #6 Ooze can slime a steal-protected card (Apple Juice)');
}
{ // #7 enemy block expires for the whole group before anyone acts (Teddy's gift survives)
  const { st } = combatVs(['bunny_guest', 'teddy_in_a_tiara', 'dino_guest'], { hero: 'aaron' });
  st.hero.hp = st.hero.maxHp = 999;
  st.hand = []; C.endTurn(st);
  const dino = st.enemies.find((e) => e.key === 'dino_guest');
  eq(dino.block, 2, '#7 the later-acting guest keeps the Block Teddy gave it');
}
{ // #8 a Sparkle on Legendary Swing adds 3 to each hit
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  forceHand(st, ['legendary_swing'], { stickers: { legendary_swing: 'sparkle' } }); st.hero.energy = 3;
  const hp = st.enemies[0].hp + st.enemies[0].block;
  C.playCard(st, card(st, 'legendary_swing'), st.enemies[0]);
  eq(hp - (st.enemies[0].hp + st.enemies[0].block), (12 + 3) * 2, '#8 Sparkle counts on Legendary Swing');
}
{ // #9 the Mirror copies your real number (3 stays 3); no attack → its own small move
  const { st } = combatVs(['makeover_mirror'], { hero: 'wyatt' });
  forceHand(st, ['quick_pass']); st.hero.energy = 1;
  C.playCard(st, card(st, 'quick_pass'), st.enemies[0]);
  st.hero.hp = st.hero.maxHp = 999;
  C.endTurn(st);
  eq(st.enemies[0].intent.dmg, 3, '#9 Mirror copies a 3-damage attack as 3');
  st.hand = []; C.endTurn(st); st.hand = []; C.endTurn(st);
  ok(st.enemies[0].intent.name === 'Mirror Glare' || st.enemies[0].intent.name === 'Polish' || st.enemies[0].intent.dmg != null, '#9 no attack last turn → Mirror Glare (or Polish)');
}
{ // #10 Sass Level damage rounds DOWN
  const run = R.newRun('aaron', 5, { sassLevel: 6 });
  const st = C.startCombat(run, { enemies: ['pink_pony'] }, makeRng(1));
  eq(C.intentPreview(st, st.enemies[0]).per, 5, '#10 SL6: Pink Pony\'s 5 × 1.1 rounds down to 5');
}

// ---------- Arena waves ----------
{
  const run = R.newRun('aaron', 5);
  run.coins = 100;
  const enc = R.enterArena(run);
  eq(run.coins, 75, 'Arena W1 fee 25');
  const st = C.startCombat(run, enc, makeRng(3), { kind: 'arena' });
  for (let w = 0; w < 3; w++) for (const e of C.livingEnemies(st)) C.dealDamage(st, e, 999, { attacker: st.hero });
  ok(st.over && st.won, 'three waves then victory');
  const before = run.coins;
  const rw = R.fightRewards(run, 'arena', makeRng(1));
  eq(rw.coins, 0, 'Arena pays no per-wave base coins (§13)');
  eq(run.coins, before, 'no pets yet → no coins');
  const broke = R.newRun('aaron', 6); broke.coins = 10;
  eq(R.enterArena(broke), null, "can't afford → walk past");
}

// ---------- economy ----------
{
  const run = R.newRun('wyatt', 11);
  eq(run.coins, 50, 'start with 50 coins');
  R.addPet(run, 'pink_poodle'); R.addPet(run, 'pony_pal'); R.addPet(run, 'dream_bunny');
  ok(R.addPet(run, 'glitter_kitten').full, 'a 4th pet needs a swap');
  const paid = R.payPets(run);
  eq(paid.reduce((a, b) => a + b.earned, 0), 3 + 5 + 7, 'pets earn 3/5/7');
  for (let i = 0; i < 5; i++) R.payPets(run);
  eq(petEarn(run.pets[0]), 4, 'a pet grows +1 once after 5 fights');
  for (let i = 0; i < 20; i++) R.payPets(run);
  eq(petEarn(run.pets[0]), 4, 'growth caps at +1');
}
{ // stickers: legality + one per card
  const kick = makeCard('kick');
  eq(canSticker(kick, 'lightning'), 'Lightning only goes on cards that cost 2 or more.', 'Lightning needs cost 2+');
  eq(canSticker(makeCard('quick_step'), 'rainbow'), 'Rainbow only goes on cards that cost 1 or more.', 'Rainbow needs cost 1+');
  eq(canSticker(kick, 'sparkle'), true, 'Sparkle on an attack');
  kick.sticker = 'sparkle';
  ok(canSticker(kick, 'star') !== true, 'one sticker per card');
  eq(cardInfo(kick).fx[0].stickerDmg, 3, 'Sparkle adds 3 damage');
  const hammer = makeCard(HAMMER_ID, false, 'sparkle');
  const run = R.newRun('aaron', 3); run.deck = run.deck.map((c) => (c.id === HAMMER_ID ? hammer : c));
  const st = C.startCombat(run, { enemies: ['stella'] }, makeRng(2));
  eq(C.hammerDamage(st), 15, 'a Sparkle on the Big Hammer makes it 15');
}
{ // Star cards cap at 5 innate (the Hammer counts)
  const run = R.newRun('aaron', 3);
  run.deck = [makeCard(HAMMER_ID), ...Array.from({ length: 7 }, () => makeCard('punch', false, 'star')), makeCard('guard'), makeCard('guard')];
  const st = C.startCombat(run, { enemies: ['stella'] }, makeRng(2));
  ok(st.hand.some((c) => c.id === HAMMER_ID), 'Hammer in the opening hand even with 7 Stars');
  eq(st.hand.length, 5, 'opening hand is still 5');
}
{ // Smiley keeps an unplayed card
  const { st } = combatVs(['stella'], { hero: 'wyatt' });
  const [k] = forceHand(st, ['kick'], { stickers: { kick: 'smiley' } });
  C.endTurn(st);
  ok(st.hand.includes(k), 'Smiley card stays in hand if unplayed');
}
{ // shop remove price climbs; Hammer can't be removed
  const run = R.newRun('aaron', 9); run.coins = 999;
  const shop = R.makeShop(run, makeRng(1));
  eq(shop.removePrice, 60, 'first removal 60');
  const hammer = run.deck.find((c) => c.id === HAMMER_ID);
  ok(!R.shopRemoveCard(run, shop, hammer.uid), "the Big Hammer can't be removed");
  R.shopRemoveCard(run, shop, run.deck[0].uid);
  eq(R.makeShop(run, makeRng(2)).removePrice, 75, 'second removal 75');
}

// ---------- maps ----------
{
  let bad = 0, noArena = 0;
  for (let s = 1; s <= 400; s++) for (let w = 1; w <= 3; w++) {
    const m = generateWorldMap(s * 104729, w);
    if (validateMap(m).length) bad++;
    if (!Object.values(m.nodes).some((n) => n.type === 'arena')) noArena++;
  }
  eq(bad, 0, 'every path meets the quotas on 1200 maps (fights, tough, shop, treasure, rest, Arena after shop)');
  eq(noArena, 0, 'every world map has exactly one Arena');
  const m = generateWorldMap(42, 1);
  const again = generateWorldMap(42, 1);
  eq(JSON.stringify(m), JSON.stringify(again), 'maps are deterministic');
}

// ---------- the infinite-turn guard (search) ----------
{
  // adversarial hands + stickers + treasures + powers: every turn ends within 40 plays
  const heroes = ['wyatt', 'aaron', 'liam'];
  let worst = 0;
  const g = makeRng(2026);
  for (let trial = 0; trial < 400; trial++) {
    const hero = heroes[trial % 3];
    const pool = Object.keys(CARDS).filter((id) => CARDS[id].hero === hero);
    const run = R.newRun(hero, trial + 1);
    run.relics = [...run.relics, 'scrunchie', 'stellas_crown', 'party_hat', 'juice_box_straw'];
    const deck = [];
    for (let i = 0; i < 14; i++) {
      const c = makeCard(g.pick(pool), g.chance(0.5));
      const sid = g.pick(STICKER_IDS);
      if (g.chance(0.6) && canSticker(c, sid) === true) c.sticker = sid;
      deck.push(c);
    }
    if (hero === 'aaron' && !deck.some((c) => c.id === HAMMER_ID)) deck.push(makeCard(HAMMER_ID));
    run.deck = deck;
    const st = C.startCombat(run, { enemies: ['delilah'] }, makeRng(trial));
    st.hero.powers = hero === 'aaron' ? { titan_grip: 1, forged: 3 } : hero === 'wyatt' ? { lightning_legs: 2, keep_moving: 5 } : { big_kid_stickers: 3 };
    st.hero.energy = 6;
    let plays = 0;
    for (;;) {
      const c = st.hand.find((x) => C.canPlay(st, x));
      if (!c || st.over) break;
      C.playCard(st, c, C.targetableEnemies(st)[0]);
      plays++;
      if (plays > 200) break;
    }
    worst = Math.max(worst, plays);
  }
  ok(worst <= 40, `no infinite turn: worst adversarial turn = ${worst} plays (≤ 40)`);
}

// ---------- text ----------
{
  const { st } = combatVs(['stella'], { hero: 'aaron' });
  st.hammer.bonus = 7;
  const t = plainText(cardInfo(makeCard(HAMMER_ID)), st);
  ok(t.includes('19'), `hammer text shows its live size (${t})`);
  const { st: s2 } = combatVs(['stella'], { hero: 'wyatt' });
  s2.momentum = 2;
  ok(plainText(cardInfo(makeCard('blur_kick')), s2).includes('right now: 12'), 'Blur Kick shows live damage in a fight (3 Momentum incl. itself × 4)');
  ok(!plainText(cardInfo(makeCard('blur_kick'))).includes('right now'), 'out of a fight the live total is hidden');
}

// ---------- save / load ----------
{
  const run = R.newRun('liam', 77);
  R.addPet(run, 'teacup_pig');
  run.deck[0].sticker = 'heart';
  const back = R.deserializeRun(R.serializeRun(run));
  ok(back && back.hero === 'liam' && back.pets[0].id === 'teacup_pig' && back.deck[0].sticker === 'heart', 'run survives save/load');
  eq(R.deserializeRun('{"v":2}'), null, 'old/foreign saves are refused');
  eq(R.deserializeRun('not json'), null, 'garbage is refused');
}

// ---------- every module parses (game.js/scenes.js etc. are DOM-bound, so nothing above imports them) ----------
{
  const { spawnSync } = await import('child_process');
  const { readdirSync } = await import('fs');
  const dir = new URL('../js/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname], { encoding: 'utf8' });
    ok(r.status === 0, `js/${f} parses${r.status ? ': ' + (r.stderr.split('\n').find((l) => /Error/.test(l)) || '') : ''}`);
  }
}

// ---------- sw.js: offline shell + shared-origin cache hygiene ----------
{
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const jsFiles = ['game', 'combat', 'run', 'map', 'cards', 'text', 'enemies', 'treasures', 'stickers', 'pets', 'rules', 'worlds', 'rng'];
  for (const f of jsFiles) ok(sw.includes(`'js/${f}.js'`), `sw SHELL precaches js/${f}.js`);
  const gamePath = new URL('../js/game.js', import.meta.url);
  if (existsSync(gamePath)) {
    const game = readFileSync(gamePath, 'utf8');
    const imports = [...game.matchAll(/from '\.\/(\w+\.js)'/g)].map((m) => `js/${m[1]}`);
    const missing = imports.filter((f) => !sw.includes(`'${f}'`));
    eq(missing.join(','), '', 'sw.js SHELL precaches every module game.js imports (offline boot)');
  }
  const CACHE = (/const CACHE = '([^']+)'/.exec(sw) || [])[1] || '';
  ok(/^rolfe-legends-4-v\d+$/.test(CACHE), `sw CACHE uses RL4's own name scheme (got ${CACHE})`);
  const SIBLINGS = ['rolfe-legends-v3', 'rolfe-legends-2-v35', 'rolfe-legends-3-v3', 'rolfe-legends-40-v1', 'some-other-app'];
  const prev = CACHE.replace(/\d+$/, (n) => String(Math.max(0, n - 1)));
  const store = new Set([CACHE, 'rolfe-legends-4-v0', prev, ...SIBLINGS]);
  const on = {};
  vm.runInNewContext(sw, {
    self: { addEventListener: (t, fn) => { on[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { keys: async () => [...store], delete: async (k) => store.delete(k), open: async () => ({ put: async () => {} }), match: async () => undefined },
    fetch: async () => ({ ok: false }),
    location: { origin: 'https://jmoranii.github.io' }, URL,
  });
  let pending;
  on.activate({ waitUntil: (p) => { pending = p; } });
  await pending;
  eq([...store].sort().join(','), [CACHE, ...SIBLINGS].sort().join(','), "sw activate deletes only RL4's own stale caches (RL1–3 survive)");
  // the ending video: byte-range and .mp4 requests pass straight through (never respondWith)
  const fetchEv = (path, headers = {}) => { let used = false; on.fetch({ request: { method: 'GET', url: `https://jmoranii.github.io/rolfe-legends-4/${path}`, headers: new Map(Object.entries(headers)), mode: 'no-cors' }, respondWith: (p) => { used = true; Promise.resolve(p).catch(() => {}); } }); return used; };
  ok(!fetchEv('assets/video/ending.mp4'), 'sw leaves the ending video to the network (no respondWith)');
  ok(!fetchEv('assets/audio/ending.mp3', { range: 'bytes=0-' }), 'sw passes byte-range requests straight through');
  ok(fetchEv('assets/cards/kick_w1.jpg'), 'sw still serves art cache-first');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
