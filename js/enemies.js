// Rolfe Legends 4 — the ATTACK OF THE COUSINS bestiary. All new (no-port rule).
// Numbers are DESIGN.md §6 v1.1 starting points; the selfplay harness tunes them.
// The cousins are affectionate comedy: fabulous, squishy, sassy — outplayed, never hurt.
// Move AI: nextMove(self, state, rng) → intent {name, kind, dmg?, times?, block?, fn?, pickHand?}
// kinds: attack | defend | buff | debuff | special | summon | countdown | sleep
// Every intent shows exact numbers (kid-fair pillar); fn effects are named in the intent.

import { applyStatus, spawnEnemy, livingEnemies, addSass, heroStealCard, slimeCard, setRuleNext } from './combat.js';
import { RULE_IDS, TEA_RULES } from './rules.js';

const A = (name, dmg, times, extra = {}) => ({ name, kind: 'attack', dmg, ...(times ? { times } : {}), ...extra });
const summonNow = (st, key) => { const d = spawnEnemy(st, key); d.intent = d.def.nextMove(d, st, st.rng); return d; };
const countLiving = (st, key) => livingEnemies(st).filter((e) => e.key === key).length;

export const ENEMIES = {
  // ======================= WORLD 1 — the Barbie Dreamhouse =======================
  pink_pony: { // StS1 Cultist — scales every turn
    name: 'Pink Pony', emoji: '🦄', hp: [27, 29], world: 1,
    nextMove() { return A('Gallop (then +2 Pumped)', 5, 0, { fn: (st, e) => applyStatus(st, e, 'pumped', 2) }); },
  },
  mannequin: { // StS1 Gremlin gang — three that move as one
    name: 'Mannequin', emoji: '🧍', hp: [10, 10], world: 1,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1 ? A('Strike a Pose', 3) : { name: 'Freeze!', kind: 'defend', block: 4 };
    },
  },
  shoe_stampede: { // multi-hit
    name: 'Shoe Stampede', emoji: '👠', hp: [21, 23], world: 1,
    nextMove() { return A('Tiny Kicks', 2, 4); },
  },
  convertible: { // StS1 charge-then-hit
    name: 'The Convertible', emoji: '🚗', hp: [33, 35], world: 1,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1 ? { name: 'HONK HONK! (revving up)', kind: 'countdown' } : A('Ram!', 14);
    },
  },
  hairbrush_hydra: { // StS1 Jaw-Worm-ish mixer
    name: 'Hairbrush Hydra', emoji: '🪮', hp: [29, 31], world: 1,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 3 === 0
        ? A('Tangle! (+ you get Wobbly 1)', 3, 3, { fn: (st) => applyStatus(st, st.hero, 'wobbly', 1) })
        : A('Bristles', 3, 3);
    },
  },
  makeover_mirror: { // tough — copies your last attack card (snapshot, max 15)
    name: 'Makeover Mirror', emoji: '🪞', hp: [73, 77], elite: true, world: 1,
    nextMove(self, state) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.n % 3 === 0) return { name: 'Polish', kind: 'defend', block: 10 };
      if (!state.prevTurnAttacked) return A('Mirror Glare', 5);
      const copied = Math.min(15, state.prevTurnLastAttack || 0);
      return A(`Copycat (your last attack: ${copied})`, copied);
    },
  },
  closet_monster: { // tough — "tries on" a card from your hand, gives it back
    name: 'Closet Monster', emoji: '👗', hp: [83, 87], elite: true, world: 1,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.n % 3 === 1) {
        return { name: 'Try It On! (takes a card for 2 turns)', kind: 'debuff', pickHand: 'steal', fn: (st, e) => heroStealCard(st, e) };
      }
      return A('Swipe', 10);
    },
  },
  barbie_guard: {
    name: 'Barbie Guard', emoji: '💂‍♀️', hp: [12, 12], world: 1,
    nextMove() { return A('Guard Poke', 3); },
  },
  stella: { // BOSS 1 — outfits in a fixed, shown order (StS1 Guardian-style mode shifts)
    name: 'Stella, Queen of Barbies', emoji: '👑', hp: [130, 130], boss: true, world: 1, cousin: true,
    init(self) { self.state.outfit = 0; },
    nextMove(self, state) {
      const OUTFITS = ['ballgown', 'sporty', 'tiara'];
      const o = OUTFITS[self.state.outfit % 3];
      self.state.outfit += 1;
      self.nextOutfit = OUTFITS[self.state.outfit % 3];
      if (o === 'ballgown') return { name: '👗 Ballgown: Twirl', kind: 'attack', dmg: 6, block: 10, outfit: 'ballgown' };
      if (o === 'sporty') return { ...A('👟 Sporty: Cartwheel Kicks', 3, 4), outfit: 'sporty' };
      if (countLiving(state, 'barbie_guard') === 0) {
        return { name: '💎 Tiara: Call a Barbie Guard', kind: 'summon', outfit: 'tiara', fn: (st) => { if (countLiving(st, 'barbie_guard') < 2) summonNow(st, 'barbie_guard'); } };
      }
      return { name: '💎 Tiara: Fix Her Crown', kind: 'defend', block: 8, outfit: 'tiara' };
    },
    onDamaged(self, state) {
      if (!self.state.half && self.hp > 0 && self.hp <= self.maxHp / 2) {
        self.state.half = true;
        while (countLiving(state, 'barbie_guard') < 2) summonNow(state, 'barbie_guard');
        state.log.push({ t: 'bossPhase', key: 'stella', text: '📣 Stella calls her Barbie Guards!' });
      }
    },
  },
  runway_diva: { // Arena W1 finale
    name: 'Runway Diva', emoji: '💃', hp: [50, 50], elite: true, world: 1,
    nextMove() { return A('Strike a Pose (then +1 Pumped)', 8, 0, { fn: (st, e) => applyStatus(st, e, 'pumped', 1) }); },
  },

  // ======================= WORLD 2 — inside a giant squishy =======================
  squishy_dumpling: { // Slow Rise: heals if you skipped hitting it
    name: 'Squishy Dumpling', emoji: '🥟', hp: [14, 14], world: 2,
    init(self) { self.squishy = 2; },
    nextMove() { return A('Bounce', 4); },
    beforeAct(self, state) {
      if (!self.state.hitThisTurn && self.hp < self.maxHp) {
        const h = Math.min(4, self.maxHp - self.hp);
        self.hp += h;
        state.log.push({ t: 'heal', target: state.enemies.indexOf(self), amount: h, src: 'slowrise' });
      }
    },
  },
  stretchy_monkey: {
    name: 'Stretchy Monkey', emoji: '🐒', hp: [39, 41], world: 2,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1 ? { name: 'Stre-e-e-etch… (SNAP next turn: 18!)', kind: 'countdown' } : A('SNAP!', 18);
    },
  },
  cube_needoh: {
    name: 'Cube NeeDoh', emoji: '🧊', hp: [44, 46], world: 2,
    init(self) { self.squishy = 5; },
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1 ? { name: 'Hunker Down', kind: 'defend', block: 8 } : A('Corner Bonk', 7);
    },
  },
  gumdrop_needoh: {
    name: 'Gumdrop NeeDoh', emoji: '🍬', hp: [34, 36], world: 2,
    nextMove() { return A('Boing Boing', 6, 2); },
  },
  teenie_needoh: {
    name: 'Teenie NeeDoh', emoji: '🔹', hp: [6, 6], world: 2,
    nextMove() { return A('Teenie Bop', 2); },
  },
  mesh_squish_ball: {
    name: 'Mesh Squish Ball', emoji: '🕸️', hp: [37, 39], world: 2,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.n % 3 === 1) return { name: 'Ooze! (Slimes a card: costs +1 this fight)', kind: 'debuff', pickHand: 'slime', fn: (st, e) => slimeCard(st, e) };
      return A('Squelch', 8);
    },
  },
  splat_ball: {
    name: 'Splat Ball', emoji: '💥', hp: [29, 31], world: 2,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1
        ? { name: 'SPLAT! (you get Wobbly 2)', kind: 'debuff', fn: (st) => applyStatus(st, st.hero, 'wobbly', 2) }
        : A('Bounce Back', 9);
    },
  },
  sticky_hand: {
    name: 'Sticky Hand', emoji: '✋', hp: [27, 29], world: 2,
    nextMove() {
      return A('Slap! (removes 5 of your Block first)', 6, 0, { pre: (st) => { st.hero.block = Math.max(0, st.hero.block - 5); } });
    },
  },
  king_needoh: { // tough — every hit makes it bigger
    name: 'King NeeDoh', emoji: '👑', hp: [88, 92], elite: true, world: 2,
    init(self) { self.squishy = 6; },
    nextMove() { return A('Royal Squash', 10); },
    onHit(self, state) {
      if ((self.pumped || 0) < 4 && self.hp > 0) { applyStatus(state, self, 'pumped', 1); state.log.push({ t: 'grow', target: state.enemies.indexOf(self) }); }
    },
  },
  water_bead_ball: { // tough — pops into a swarm
    name: 'Water-Bead Ball', emoji: '🔵', hp: [83, 87], elite: true, world: 2,
    nextMove() { return A('Gush', 12); },
    onDeath(self, state) {
      for (let i = 0; i < 6; i++) spawnEnemy(state, 'water_bead');
      for (const e of state.enemies) if (e.key === 'water_bead' && !e.intent) e.intent = e.def.nextMove(e, state, state.rng);
      state.log.push({ t: 'bossPhase', key: 'water_bead_ball', text: '💦 POP! It bursts into beads!' });
    },
  },
  water_bead: {
    name: 'Water Bead', emoji: '💧', hp: [4, 4], world: 2,
    nextMove() { return A('Plip', 2); },
  },
  lucy: { // BOSS 2 — Squishy 6; Mega Squish at half
    name: 'Lucy, Ruler of Squishies', emoji: '🫧', hp: [200, 200], boss: true, world: 2, cousin: true,
    init(self) { self.squishy = 5; },
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.mega) {
        return self.state.n % 2 === 1 ? A('MEGA SQUISH SLAM', 22) : { name: 'Jiggle', kind: 'defend', block: 12 };
      }
      const k = self.state.n % 3;
      if (k === 1) return A('Squish Throw (+ Slimes a card)', 8, 0, { pickHand: 'slime', fn: (st, e) => slimeCard(st, e) });
      if (k === 2) return { name: 'Squeeze! (block 12, calls 2 Teenie NeeDohs)', kind: 'summon', block: 12,
        fn: (st) => { summonNow(st, 'teenie_needoh'); summonNow(st, 'teenie_needoh'); } };
      return A('Stress Test', 16);
    },
    onDamaged(self, state) {
      if (!self.state.mega && self.hp > 0 && self.hp <= self.maxHp / 2) {
        self.state.mega = true;
        self.squishy = 6; self.squishLeft = Math.min(self.squishLeft || 0, 6);
        self.name = 'MEGA SQUISH Lucy'; self.artKey = 'lucy_mega';
        self.state.n = 0;
        self.intent = self.def.nextMove(self, state, state.rng);
        state.log.push({ t: 'bossPhase', key: 'lucy', text: '🫧 MEGA SQUISH! Lucy squishes herself GIANT!' });
      }
    },
  },
  mega_stress_ball: { // Arena W2 finale
    name: 'Mega Stress Ball', emoji: '🟠', hp: [60, 60], elite: true, world: 2,
    init(self) { self.squishy = 6; },
    nextMove() { return A('Big Squeeze', 10); },
  },

  // ======================= WORLD 3 — Delilah's Sassy Tea Party =======================
  teapot_tantrum: { // countdown to a big boil
    name: 'Teapot Tantrum', emoji: '🫖', hp: [43, 45], world: 3,
    nextMove(self) {
      self.state.heat = ((self.state.heat || 0) % 4) + 1;
      if (self.state.heat < 4) return { name: `Heating up… ${self.state.heat}/3 (BOILS OVER at 4!)`, kind: 'countdown' };
      return A('BOIL OVER!', 30);
    },
  },
  snooty_teacup: {
    name: 'Snooty Teacup', emoji: '☕', hp: [14, 14], world: 3,
    nextMove() { return A('Clink', 3); },
    onDeath(self, state) {
      for (const e of livingEnemies(state)) if (e.key === 'snooty_teacup' && e !== self) applyStatus(state, e, 'pumped', 2);
      state.log.push({ t: 'bossPhase', key: 'teacup', text: '☕ The other teacups are OFFENDED! (+2 Pumped)' });
    },
  },
  sugar_cube: { // twins take turns dissolving; one is always hittable
    name: 'Sugar Cube', emoji: '🧊', hp: [29, 31], world: 3,
    init(self, state) {
      const twins = state.enemies.filter((e) => e.key === 'sugar_cube');
      self.dissolved = twins.length > 0 && !twins[twins.length - 1].dissolved; // alternate A/B
    },
    nextMove(self) { return self.dissolved ? { name: 'Dissolved… (reappears next)', kind: 'sleep' } : A('Sugar Rush (then dissolves)', 7); },
    afterAct(self, state) {
      const partner = livingEnemies(state).find((e) => e.key === 'sugar_cube' && e !== self);
      self.dissolved = partner ? !self.dissolved : false; // alone → stays solid (never untargetable)
    },
    onDeath(self, state) {
      const partner = livingEnemies(state).find((e) => e.key === 'sugar_cube' && e !== self);
      if (partner && partner.dissolved) {
        partner.dissolved = false;
        partner.intent = A('Sugar Rush', 7);
        state.log.push({ t: 'bossPhase', key: 'sugar_cube', text: '🧊 The other Sugar Cube pops back out!' });
      }
    },
  },
  rude_scone: {
    name: 'Rude Scone', emoji: '🥯', hp: [39, 41], world: 3,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 2 === 1
        ? { name: '"Nice outfit. NOT." (adds 1 Sass)', kind: 'debuff', fn: (st) => addSass(st, 'insult') }
        : A('Crumb Toss', 7);
    },
  },
  spoon_knight: {
    name: 'Spoon Knight', emoji: '🥄', hp: [39, 41], world: 3,
    nextMove() { return A('Poke Poke Poke', 3, 4); },
  },
  teddy_in_a_tiara: { // tough — guests must be beaten first
    name: 'Teddy in a Tiara', emoji: '🧸', hp: [88, 92], elite: true, world: 3,
    init(self, state) { self.state.hosting = true; },
    nextMove() {
      return A('Royal Hug (guests get +2 Block)', 9, 0, {
        fn: (st) => { for (const g of livingEnemies(st)) if (g.def.guest) g.block += 2; },
      });
    },
  },
  bunny_guest: { name: 'Bunny Guest', emoji: '🐰', hp: [20, 20], world: 3, guest: true, nextMove() { return A('Nibble', 4); } },
  dino_guest: { name: 'Dino Guest', emoji: '🦖', hp: [20, 20], world: 3, guest: true, nextMove() { return A('Tiny Roar', 4); } },
  tea_time_clock: { // tough — TEA TIME heals (max twice per fight)
    name: 'Tea Time Clock', emoji: '🕰️', hp: [108, 112], elite: true, world: 3,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.n % 3 === 0 && (self.state.teas || 0) < 2) {
        return { name: "IT'S TEA TIME! (all enemies heal 10)", kind: 'buff', fn: (st, e) => {
          e.state.teas = (e.state.teas || 0) + 1;
          for (const x of livingEnemies(st)) { const h = Math.min(10, x.maxHp - x.hp); x.hp += h; if (h) st.log.push({ t: 'heal', target: st.enemies.indexOf(x), amount: h, src: 'teatime' }); }
        } };
      }
      return A('Tick-Tock Bonk', 11);
    },
  },
  delilah: { // FINAL BOSS — rules, Sass, the Nuh-Uh Shield; phase 2 TANTRUM
    name: 'Delilah the Sassafras', emoji: '💅', hp: [260, 260], boss: true, world: 3, cousin: true,
    init(self, state) { self.state.phase = 1; },
    nextMove(self, state, rng) {
      self.state.n = (self.state.n || 0) + 1;
      if (self.state.phase === 2) {
        return self.state.n % 2 === 1 ? A('TANTRUM STOMP', 21) : A('TABLE FLIP!', 26);
      }
      const k = self.state.n % 3;
      if (k === 1) return A('Sass Attack (+1 Sass)', 17, 0, { fn: (st) => addSass(st, 'delilah') });
      if (k === 2) {
        const choices = RULE_IDS.filter((r) => r !== state.rule);
        const next = rng.pick(choices);
        return { name: `"Because I SAID so!" Next rule: ${TEA_RULES[next].name}`, kind: 'special', nextRule: next,
          fn: (st) => setRuleNext(st, next) };
      }
      return { name: 'Nuh-Uh Shield! (20)', kind: 'defend', fn: (st, e) => { e.shield = 20; e.shieldMax = 20; } };
    },
    onDamaged(self, state) {
      if (self.state.phase === 1 && self.hp <= 0) {
        self.state.phase = 2; self.state.n = 0;
        self.maxHp = Math.round(180 * (self.hpMult || 1)); self.hp = self.maxHp;
        self.shield = 0; self.block = 0; self.wideOpen = 0; self.wobbly = 0;
        self.name = 'Delilah — TANTRUM!'; self.artKey = 'delilah_tantrum';
        state.rule = null; state.nextRule = null; state.rulesOff = true;
        summonNow(state, 'rude_scone'); summonNow(state, 'snooty_teacup');
        self.intent = self.def.nextMove(self, state, state.rng);
        state.log.push({ t: 'bossPhase', key: 'delilah', text: '💥 TANTRUM! She flips the whole table!' });
      }
    },
  },
  headmistress_teapot: { // Arena W3 finale
    name: 'Headmistress Teapot', emoji: '🍵', hp: [70, 70], elite: true, world: 3,
    nextMove(self) {
      self.state.n = (self.state.n || 0) + 1;
      return self.state.n % 3 === 0 ? A('BOIL OVER!', 25) : A('Tsk Tsk', 6);
    },
  },
};
