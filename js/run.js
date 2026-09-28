// Rolfe Legends 4 — run layer (pure, no DOM): one run, one deck, three worlds.
// Aaron's economy lives here: coins, money pets, the Arena, shops, stickers.
// DESIGN.md §4–§5 with the §13 accounting rules.

import { HEROES, CARDS, makeCard, draftPool, RARITY_WEIGHTS, upgradableCards, bumpUid } from './cards.js';
import { TREASURES, treasurePool, bossTreasurePool } from './treasures.js';
import { PETS, PET_TIERS, PET_SLOTS, petsOf, petEarn } from './pets.js';
import { STICKER_IDS, STICKER_PRICE, canSticker } from './stickers.js';
import { WORLDS, WORLD_COUNT } from './worlds.js';
import { RULE_IDS } from './rules.js';
import { makeRng } from './rng.js';
import { generateWorldMap, reachableIds, BOSS_ID } from './map.js';

export const START_COINS = 50;
export const RUN_VERSION = 4;

// ---------- run creation ----------
export function newRun(heroId, seed, { sassLevel = 0 } = {}) {
  const hero = HEROES[heroId];
  const maxHp = hero.hp - (sassLevel >= 8 ? 5 : 0);
  return {
    v: RUN_VERSION, seed, rngCalls: 0,
    hero: heroId, hp: maxHp, maxHp,
    coins: START_COINS,
    deck: hero.starter.map((id) => makeCard(id)),
    relics: [hero.relic],
    pets: [],                // [{ id, fights }]
    petSlots: PET_SLOTS,
    freeStickers: 0,
    world: 1, floor: 0,
    map: generateWorldMap(seed, 1),
    pos: null, trail: [],
    visitorDone: false,
    removeUses: 0,
    sassLevel,
    stats: { fights: 0, elites: 0, arenas: 0, turns: 0, coinsBase: 0, coinsPets: 0, coinsOther: 0, spent: 0, sassTotal: 0, w3Fights: 0, arenaSkippedBroke: 0 },
  };
}

export function runRng(run) {
  run.rngCalls += 1;
  return makeRng((run.seed ^ (run.world * 7919) ^ (run.floor * 104729) ^ Math.imul(run.rngCalls, 0x27D4EB2F)) >>> 0);
}

// ---------- the map ----------
export function nextNodes(run) {
  return reachableIds(run.map, run.pos).map((id) => ({ id, ...run.map.nodes[id] }));
}

export function enterMapNode(run, id) {
  if (!reachableIds(run.map, run.pos).includes(id)) return null;
  const node = run.map.nodes[id];
  run.pos = id;
  run.trail.push(id);
  run.floor = node.f;
  return resolveNode(run, node.type);
}

function ruleFor(run, rng) {
  return run.world === 3 ? rng.pick(RULE_IDS) : null;
}

export function resolveNode(run, type) {
  const rng = runRng(run);
  const W = WORLDS[run.world];
  const enc = W.encounters;
  switch (type) {
    case 'fight': {
      const pool = run.floor <= 2 ? enc.easy : (rng.chance(0.3) ? enc.easy : enc.hard);
      return { type: 'fight', encounter: { enemies: rng.pick(pool), rule: ruleFor(run, rng) } };
    }
    case 'elite': return { type: 'elite', encounter: { enemies: rng.pick(enc.elite), rule: ruleFor(run, rng) } };
    case 'boss': return { type: 'boss', encounter: { enemies: rng.pick(enc.boss), rule: ruleFor(run, rng) } };
    case 'arena': return { type: 'arena', arena: arenaInfo(run) };
    case 'shop': return { type: 'shop', shop: makeShop(run, rng) };
    case 'treasure': {
      const p = treasurePool(run.relics);
      const t = p.length ? rng.pick(p) : null;
      if (t) gainTreasure(run, t);
      return { type: 'treasure', treasure: t };
    }
    case 'rest': return { type: 'rest' };
    default: return { type };
  }
}

// ---------- treasures ----------
export function gainTreasure(run, id) {
  if (!TREASURES[id] || run.relics.includes(id)) return false;
  run.relics.push(id);
  if (id === 'piggy_bank') { run.coins += 50; run.stats.coinsOther += 50; }
  if (id === 'golden_pet_collar') run.petSlots += 1;
  if (id === 'sticker_pack') run.freeStickers += 3;
  return true;
}

// ---------- the family visitor (StS2 Ancient) at each world's start ----------
export function visitorOffers(run) {
  return WORLDS[run.world].visitor.offers;
}
// Returns { done: true } or { pick: 'rare'|'remove'|'upgrade'|'boss'|'duplicate', options } for the UI.
export function applyVisitor(run, offer, rng = runRng(run)) {
  run.visitorDone = true;
  switch (offer) {
    case 'maxhp10': run.maxHp += 10; run.hp += 10; return { done: true };
    case 'rare_pick': {
      const rares = draftPool(run.hero).filter((id) => CARDS[id].rarity === 'rare');
      return { pick: 'rare', options: rng.shuffle(rares).slice(0, 3) };
    }
    case 'remove2': return { pick: 'remove', n: 2, options: run.deck.filter((c) => CARDS[c.id].rarity === 'starter' && !CARDS[c.id].signature) };
    case 'upgrade3': return { pick: 'upgrade', n: 3, options: upgradableCards(run.deck) };
    case 'super_pet': { const id = rng.pick(petsOf(run.world, 'super')); return { done: true, pet: id, petResult: addPet(run, id) }; }
    case 'treasure': { const p = treasurePool(run.relics); const t = p.length ? rng.pick(p) : null; if (t) gainTreasure(run, t); return { done: true, treasure: t }; }
    case 'heal_full': run.hp = run.maxHp; return { done: true };
    case 'boss_treasure2': return { pick: 'boss', options: rng.shuffle(bossTreasurePool(run.relics)).slice(0, 2) };
    case 'duplicate': return { pick: 'duplicate', options: run.deck.filter((c) => CARDS[c.id].type !== 'status' && !CARDS[c.id].signature) };
    default: return { done: true };
  }
}

// ---------- money pets ----------
// { ok } | { full: true } (UI then asks which pet to send home → swapPet)
export function addPet(run, id) {
  if (!PETS[id]) return { ok: false };
  if (run.pets.length < run.petSlots) { run.pets.push({ id, fights: 0 }); return { ok: true }; }
  return { full: true, id };
}
export function swapPet(run, releaseIdx, id) {
  if (releaseIdx < 0 || releaseIdx >= run.pets.length) return false;
  run.pets.splice(releaseIdx, 1, { id, fights: 0 });
  return true;
}
// Pay every pet after a won fight (BEFORE new drops, §13). Returns [{id, earned}].
export function payPets(run) {
  const out = [];
  for (const p of run.pets) {
    let e = petEarn(p);
    if (run.sassLevel >= 7) e = Math.max(1, e - 1);
    p.fights += 1;
    out.push({ id: p.id, earned: e });
  }
  const total = out.reduce((a, b) => a + b.earned, 0);
  run.coins += total;
  run.stats.coinsPets += total;
  return out;
}
export function rollPetDrop(run, kind, rng) {
  const W = run.world;
  if (kind === 'elite') return rng.pick(petsOf(W, rng.chance(0.5) ? 'rare' : 'common'));
  if (kind === 'fight') {
    if (W === 1 && run.stats.fights === 3 && !run.stats.guaranteedPet) { run.stats.guaranteedPet = true; return rng.pick(petsOf(1, 'common')); }
    return rng.chance(0.2) ? rng.pick(petsOf(W, 'common')) : null;
  }
  return null;
}

// ---------- combat rewards ----------
const PRICE = { common: 45, uncommon: 70, rare: 140 };
export function pickRarity(rng) {
  const total = RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon + RARITY_WEIGHTS.rare;
  let r = rng.int(total);
  if ((r -= RARITY_WEIGHTS.common) < 0) return 'common';
  if ((r -= RARITY_WEIGHTS.uncommon) < 0) return 'uncommon';
  return 'rare';
}
export function cardDraft(run, rng, n = 3, force = null) {
  const pool = draftPool(run.hero);
  const picks = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const rarity = force || pickRarity(rng);
    let cands = pool.filter((id) => CARDS[id].rarity === rarity && !used.has(id));
    if (!cands.length) cands = pool.filter((id) => !used.has(id));
    if (!cands.length) break;
    const id = rng.pick(cands);
    used.add(id); picks.push(id);
  }
  return picks;
}

// After a won fight: coins (base), pets paid, a pet drop, a card choice.
export function fightRewards(run, kind, rng) {
  const r = { coins: 0, pets: [], petDrop: null, cards: [], treasure: null, bossTreasures: null };
  if (kind === 'fight') r.coins = rng.range(12, 18);
  if (kind === 'elite') r.coins = 30;
  if (kind === 'boss') r.coins = 60;
  if (kind === 'arena') r.coins = 0; // one encounter: no per-wave coins (§13)
  run.coins += r.coins; run.stats.coinsBase += r.coins;
  r.pets = payPets(run);
  if (kind === 'fight' || kind === 'elite') r.petDrop = rollPetDrop(run, kind, rng);
  if (kind !== 'boss') r.cards = cardDraft(run, rng, run.relics.includes('lucky_penny') ? 4 : 3);
  if (kind === 'boss' && run.world < WORLD_COUNT) r.bossTreasures = rng.shuffle(bossTreasurePool(run.relics)).slice(0, 3);
  return r;
}

export function applyCombatResult(run, st, kind) {
  run.hp = st.hero.hp;
  run.stats.turns += st.turn;
  if (kind === 'fight') run.stats.fights += 1;
  if (kind === 'elite') run.stats.elites += 1;
  if (run.world === 3) { run.stats.w3Fights += 1; run.stats.sassTotal += st.sassAdded || 0; }
  let teacup = null;
  if (run.relics.includes('teacup_of_courage') && run.hp > 0) { teacup = Math.min(3, run.maxHp - run.hp); run.hp += teacup; }
  if (st.coinsEarned) { run.coins += st.coinsEarned; run.stats.coinsOther += st.coinsEarned; }
  return { teacup, stickerCoins: st.coinsEarned || 0 };
}

// ---------- the Arena (Aaron: "pay a little to battle") ----------
export function arenaInfo(run) {
  const a = WORLDS[run.world].arena;
  return { fee: a.fee, name: a.name, waves: a.waves, affordable: run.coins >= a.fee };
}
export function enterArena(run) {
  const a = WORLDS[run.world].arena;
  if (run.coins < a.fee) { run.stats.arenaSkippedBroke += 1; return null; }
  run.coins -= a.fee; run.stats.spent += a.fee; run.stats.arenas += 1;
  const [first, ...rest] = a.waves;
  return { enemies: first.enemies, rule: first.rule || null, waves: rest };
}
// prize: 'pet' → a SUPER pet; 'card' → choose a rare card + a free sticker
export function arenaPrize(run, choice, rng) {
  if (choice === 'pet') { const id = rng.pick(petsOf(run.world, 'super')); return { pet: id, petResult: addPet(run, id) }; }
  run.freeStickers += 1;
  return { cards: cardDraft(run, rng, 3, 'rare') };
}

// ---------- shop ----------
function priceMult(run) { return run.sassLevel >= 7 ? 1.15 : 1; }
export function makeShop(run, rng) {
  const m = priceMult(run);
  const cards = cardDraft(run, rng, 5).map((id) => ({ id, price: Math.round(PRICE[CARDS[id].rarity] * (0.9 + rng.random() * 0.2) * m) }));
  const stickers = rng.shuffle(STICKER_IDS).slice(0, 3).map((id) => ({ id, price: Math.round(STICKER_PRICE * m) }));
  return { cards, stickers, removePrice: Math.round((60 + 15 * run.removeUses) * m), removed: false };
}
export function shopBuyCard(run, shop, i) {
  const item = shop.cards[i];
  if (!item || run.coins < item.price) return false;
  run.coins -= item.price; run.stats.spent += item.price;
  run.deck.push(makeCard(item.id));
  shop.cards.splice(i, 1);
  return true;
}
// buy sticker `i` and put it on card `uid` right away (legality from stickers.js)
export function shopBuySticker(run, shop, i, uid) {
  const item = shop.stickers[i];
  const card = run.deck.find((c) => c.uid === uid);
  if (!item || !card || run.coins < item.price) return false;
  if (canSticker(card, item.id) !== true) return false;
  run.coins -= item.price; run.stats.spent += item.price;
  card.sticker = item.id;
  shop.stickers.splice(i, 1);
  return true;
}
export function applyFreeSticker(run, sid, uid) {
  const card = run.deck.find((c) => c.uid === uid);
  if (!card || run.freeStickers <= 0 || canSticker(card, sid) !== true) return false;
  card.sticker = sid; run.freeStickers -= 1;
  return true;
}
export function shopRemoveCard(run, shop, uid) {
  if (shop.removed || run.coins < shop.removePrice) return false;
  const i = run.deck.findIndex((c) => c.uid === uid);
  if (i < 0 || CARDS[run.deck[i].id].signature) return false;
  run.coins -= shop.removePrice; run.stats.spent += shop.removePrice;
  run.deck.splice(i, 1);
  shop.removed = true; run.removeUses += 1;
  return true;
}

// ---------- rest ----------
export function restHealAmount(run) { return Math.floor(run.maxHp * (run.sassLevel >= 9 ? 0.2 : 0.3)); }
export function restHeal(run) {
  const h = Math.min(restHealAmount(run), run.maxHp - run.hp);
  run.hp += h;
  return h;
}
export function restPractice(run, uid) {
  const c = run.deck.find((x) => x.uid === uid && !x.up && CARDS[x.id].up);
  if (!c) return false;
  c.up = true;
  return true;
}
export function removeCard(run, uid) {
  const i = run.deck.findIndex((c) => c.uid === uid);
  if (i < 0 || CARDS[run.deck[i].id].signature) return false;
  run.deck.splice(i, 1);
  return true;
}
export function duplicateCard(run, uid) {
  const c = run.deck.find((x) => x.uid === uid);
  if (!c) return false;
  run.deck.push(makeCard(c.id, c.up, null));
  return true;
}

// ---------- boss → next world ----------
export function afterBoss(run) {
  run.hp = run.sassLevel >= 5 ? Math.min(run.maxHp, run.hp + Math.floor(run.maxHp / 2)) : run.maxHp;
}
export function advanceWorld(run) {
  if (run.world >= WORLD_COUNT) return false;
  run.world += 1;
  run.floor = 0;
  run.map = generateWorldMap(run.seed, run.world);
  run.pos = null;
  run.trail = [];
  run.visitorDone = false;
  return true;
}

// ---------- save / load ----------
export function serializeRun(run) { return JSON.stringify(run); }
export function deserializeRun(json) {
  try {
    const run = JSON.parse(json);
    if (!run || run.v !== RUN_VERSION || !HEROES[run.hero]) return null;
    if (!Array.isArray(run.deck) || !run.deck.every((c) => CARDS[c.id])) return null;
    if (!run.map || !run.map.nodes || !run.map.nodes[BOSS_ID]) return null;
    if (!Array.isArray(run.pets) || !run.pets.every((p) => PETS[p.id])) return null;
    if (run.pending && (!run.pending.encounter || !Array.isArray(run.pending.encounter.enemies))) run.pending = null;
    for (const c of run.deck) bumpUid(c.uid);
    return run;
  } catch { return null; }
}
export { PET_TIERS };
