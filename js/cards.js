// Rolfe Legends 4 — card data. Pure data + pure helpers; js/combat.js interprets.
// Every card names its inspiration (DESIGN.md §3). ALL content is new for RL4 —
// test/test.mjs enforces that no name collides with RL2/RL3 (the no-port rule).
//
// Effect ops (fx array, run in order):
//   dmg, times, allEnemies            attack damage (Pumped/Wobbly/Wide Open apply)
//   dmgPerMomentum                    +N damage per Momentum (this card counts)
//   block, draw, energy
//   status: { k, n, target }          k: 'pumped' | 'wobbly' | 'wideOpen'; target: 'target' | 'self' | 'all'
//   ifMomentum: { n, fx: [...] }      run nested ops when Momentum ≥ n
//   potty: N                          fill Liam's Potty meter (10 → FLUSH!)
//   hammerPlus: N                     Big Hammer +N damage this fight
//   hammerAll                         Big Hammer hits ALL enemies this fight
//   hammerNextDiscount: N             the NEXT Big Hammer you play this turn costs N less
//   hammerBounce                      the NEXT Big Hammer you play this turn comes back to your hand (once)
//   hammerSwing                       (the Big Hammer itself) deal the hammer's damage
//   hammerHalf: { kind, plus }        half the hammer's damage (+plus) as 'dmg' or 'block'
//   hammerTwice                       deal the hammer's damage twice (NOT a Hammer play)
//   pottySpend: { n, block }          spend N Potty → block (unplayable below N)
//   pottyDance: N                     deal N per 2 Potty (doesn't spend)
//   pottyAll: N                       spend ALL Potty, deal N × Potty
//   doubleFlush                       your next FLUSH! this fight happens twice
//   emergency: N                      if Potty ≥ N, FLUSH! right now
//   discardHandDraw                   discard your hand, draw that many
//   relay: N                          draw N; each drawn card's NEXT play this turn costs 0
//   power: 'id', pn                   a lasting power for this fight
// Flags: exhausts, innate, unplayable, signature (never stolen / Slimed / cancelled),
//        momentumDiscount (costs 1 less per N Momentum).

export const HEROES = {
  wyatt: {
    id: 'wyatt', name: 'Wyatt the Speedy', short: 'Wyatt', emoji: '⚡', hp: 62,
    relic: 'stopwatch', mechanic: 'momentum',
    tagline: 'Fastest feet on the farm. The more cards he plays, the faster he gets.',
    starter: ['kick', 'kick', 'kick', 'kick', 'dodge', 'dodge', 'dodge', 'dodge', 'quick_step', 'dash_attack'],
  },
  aaron: {
    id: 'aaron', name: 'Aaron the Strong', short: 'Aaron', emoji: '💪', hp: 74,
    relic: 'weight_belt', mechanic: 'hammer',
    tagline: 'Brings the Big Hammer to every fight — and makes it BIGGER.',
    starter: ['punch', 'punch', 'punch', 'punch', 'guard', 'guard', 'guard', 'guard', 'big_hammer', 'sharpen'],
  },
  liam: {
    id: 'liam', name: 'Liam the Potty Trained', short: 'Liam', emoji: '🚽', hp: 58,
    relic: 'sticker_chart', mechanic: 'potty',
    tagline: 'A big kid now. Fill the Potty meter… then FLUSH!',
    starter: ['toddle', 'toddle', 'toddle', 'toddle', 'hide', 'hide', 'hide', 'hide', 'sippy_cup', 'waddle'],
  },
};

export const FLUSH_BASE = 15;      // FLUSH! damage to ALL enemies
export const FLUSH_BLOCK = 5;
export const POTTY_MAX = 10;
export const HAMMER_ID = 'big_hammer';

export const CARDS = {
  // ================= ⚡ WYATT THE SPEEDY — Momentum =================
  kick: { hero: 'wyatt', name: 'Speedy Kick', emoji: '🦶', type: 'attack', cost: 1, rarity: 'starter', src: 'StS1 Strike',
    text: 'Deal {d} damage.', fx: [{ dmg: 6 }], up: { fx: [{ dmg: 9 }] } },
  dodge: { hero: 'wyatt', name: 'Swerve', emoji: '💨', type: 'skill', cost: 1, rarity: 'starter', src: 'StS1 Defend',
    text: 'Gain {b} Block.', fx: [{ block: 5 }], up: { fx: [{ block: 8 }] } },
  quick_step: { hero: 'wyatt', name: 'Quick Step', emoji: '👟', type: 'skill', cost: 0, rarity: 'starter', src: 'StS1 Prepared',
    text: 'Draw {n} card. Used up.', fx: [{ draw: 1 }], exhausts: true, up: { fx: [{ draw: 2 }], text: 'Draw {n} cards. Used up.' } },
  dash_attack: { hero: 'wyatt', name: 'Dash Attack', emoji: '🏃', type: 'attack', cost: 1, rarity: 'starter', src: 'StS2 Momentum scaler',
    text: 'Deal {d} damage (+{n} for every Momentum).', noSteal: true, fx: [{ dmg: 3, dmgPerMomentum: 2 }], up: { fx: [{ dmg: 4, dmgPerMomentum: 3 }] } },

  zoom: { hero: 'wyatt', name: 'Zoom', emoji: '🌀', type: 'attack', cost: 1, rarity: 'common', src: 'StS1 Sneaky Strike (conditional)',
    text: 'Deal {d} damage. Momentum 3+: draw 1.', fx: [{ dmg: 7 }, { ifMomentum: { n: 3, fx: [{ draw: 1 }] } }],
    up: { fx: [{ dmg: 10 }, { ifMomentum: { n: 3, fx: [{ draw: 1 }] } }] } },
  cartwheel: { hero: 'wyatt', name: 'Cartwheel', emoji: '🤸', type: 'skill', cost: 1, rarity: 'common', src: 'StS1 Backflip',
    text: 'Gain {b} Block. Draw 2.', fx: [{ block: 5 }, { draw: 2 }], up: { fx: [{ block: 8 }, { draw: 2 }] } },
  quick_pass: { hero: 'wyatt', name: 'Quick Pass', emoji: '⚽', type: 'attack', cost: 0, rarity: 'common', src: 'StS1 Shiv',
    text: 'Deal {d} damage.', fx: [{ dmg: 3 }], up: { fx: [{ dmg: 5 }] } },
  tap_tap: { hero: 'wyatt', name: 'Tap Tap', emoji: '👣', type: 'attack', cost: 1, rarity: 'common', src: 'StS1 Twin Strike',
    text: 'Deal {d} damage twice.', fx: [{ dmg: 3, times: 2 }], up: { fx: [{ dmg: 5, times: 2 }] } },
  juke: { hero: 'wyatt', name: 'Juke', emoji: '↪️', type: 'skill', cost: 1, rarity: 'common', src: 'StS1 Dodge and Roll',
    text: 'Gain {b} Block. Momentum 3+: gain {n} more.', fx: [{ block: 8 }, { ifMomentum: { n: 3, fx: [{ block: 4 }] } }], pn: 4,
    up: { fx: [{ block: 10 }, { ifMomentum: { n: 3, fx: [{ block: 5 }] } }], pn: 5 } },
  warm_up: { hero: 'wyatt', name: 'Warm Up', emoji: '🙆', type: 'skill', cost: 0, rarity: 'common', src: 'StS1 Prepared',
    text: 'Draw {n} card. Used up.', fx: [{ draw: 1 }], exhausts: true, up: { fx: [{ draw: 2 }], text: 'Draw {n} cards. Used up.' } },
  slide_tackle: { hero: 'wyatt', name: 'Scissor Kick', emoji: '🥅', type: 'attack', cost: 1, rarity: 'uncommon', src: 'StS1 Neutralize+',
    text: 'Deal {d} damage. Make it Wobbly {n}.', fx: [{ dmg: 6 }, { status: { k: 'wobbly', n: 1, target: 'target' } }],
    up: { fx: [{ dmg: 8 }, { status: { k: 'wobbly', n: 2, target: 'target' } }] } },
  hat_trick: { hero: 'wyatt', name: 'Three-Peat', emoji: '🎩', type: 'attack', cost: 1, rarity: 'uncommon', src: 'StS1 Finisher',
    text: 'Deal {d} damage. Momentum 3+: hit 2 more times.', fx: [{ dmg: 4 }, { ifMomentum: { n: 3, fx: [{ dmg: 4, times: 2 }] } }],
    up: { fx: [{ dmg: 5 }, { ifMomentum: { n: 3, fx: [{ dmg: 5, times: 2 }] } }] } },
  blur_kick: { hero: 'wyatt', name: 'Blur Kick', emoji: '💫', type: 'attack', cost: 2, rarity: 'uncommon', src: 'StS2 scaling attack',
    text: 'Deal {n} damage for every Momentum (this card counts too){now}.', fx: [{ dmg: 0, dmgPerMomentum: 4 }], up: { fx: [{ dmg: 0, dmgPerMomentum: 5 }] } },
  shuffle_step: { hero: 'wyatt', name: 'Shuffle Step', emoji: '🔀', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 Calculated Gamble',
    text: 'Discard your hand, then draw that many cards.', fx: [{ discardHandDraw: true }], up: { cost: 0 } },
  keep_moving: { hero: 'wyatt', name: 'Keep Moving', emoji: '🔁', type: 'power', cost: 1, rarity: 'uncommon', src: 'StS1 After Image',
    text: 'Every time you play your 4th card in a turn, gain {n} Block.', power: 'keep_moving', pn: 5, up: { pn: 8 } },
  whirlwind_kick: { hero: 'wyatt', name: 'Whirlwind Kick', emoji: '🌪️', type: 'attack', cost: 1, rarity: 'uncommon', src: "StS1 Dagger Spray (Wyatt's AoE)",
    text: 'Deal {d} damage to ALL enemies. Momentum 3+: do it again.', fx: [{ dmg: 3, allEnemies: true }, { ifMomentum: { n: 3, fx: [{ dmg: 3, allEnemies: true }] } }],
    up: { fx: [{ dmg: 4, allEnemies: true }, { ifMomentum: { n: 3, fx: [{ dmg: 4, allEnemies: true }] } }] } },
  lightning_legs: { hero: 'wyatt', name: 'Lightning Legs', emoji: '⚡', type: 'power', cost: 2, rarity: 'rare', src: 'Original',
    text: 'Your Momentum starts every turn at {n}.', power: 'lightning_legs', pn: 2, up: { cost: 1 } },
  photo_finish: { hero: 'wyatt', name: 'Photo Finish', emoji: '📸', type: 'attack', cost: 2, rarity: 'rare', src: 'StS1 Masterful Stab / Eviscerate',
    text: 'Deal {d} damage. Costs 1 less for every 2 Momentum.', fx: [{ dmg: 20 }], momentumDiscount: 2, up: { fx: [{ dmg: 26 }] } },
  relay_race: { hero: 'wyatt', name: 'Relay Race', emoji: '🏁', type: 'skill', cost: 1, rarity: 'rare', src: 'StS1 Setup-ish',
    text: 'Draw {n} cards. The next time you play each of them this turn, it costs 0. Used up.', fx: [{ relay: 2 }], exhausts: true,
    up: { fx: [{ relay: 3 }] } },

  // ================= 💪 AARON THE STRONG — the Big Hammer =================
  punch: { hero: 'aaron', name: 'Punch', emoji: '👊', type: 'attack', cost: 1, rarity: 'starter', src: 'StS1 Strike',
    text: 'Deal {d} damage.', fx: [{ dmg: 6 }], up: { fx: [{ dmg: 9 }] } },
  guard: { hero: 'aaron', name: 'Guard', emoji: '🛡️', type: 'skill', cost: 1, rarity: 'starter', src: 'StS1 Defend',
    text: 'Gain {b} Block.', fx: [{ block: 5 }], up: { fx: [{ block: 8 }] } },
  big_hammer: { hero: 'aaron', name: 'Big Hammer', emoji: '🔨', type: 'attack', cost: 2, rarity: 'starter', src: 'StS2 Regent: Sovereign Blade',
    text: 'SMASH for {h} damage.', fx: [{ hammerSwing: true }], hammerBase: 12, innate: true, signature: true, up: { hammerBase: 16 } },
  sharpen: { hero: 'aaron', name: 'Sharpen', emoji: '🪨', type: 'skill', cost: 1, rarity: 'starter', src: 'StS2 Regent forge',
    text: 'Big Hammer +{n} this fight. Gain {b} Block.', noSteal: true, fx: [{ hammerPlus: 3 }, { block: 4 }], up: { fx: [{ hammerPlus: 5 }, { block: 6 }] } },

  uppercut: { hero: 'aaron', name: 'Haymaker', emoji: '🥊', type: 'attack', cost: 1, rarity: 'common', src: 'StS1 Strike+',
    text: 'Deal {d} damage.', fx: [{ dmg: 9 }], up: { fx: [{ dmg: 12 }] } },
  temper: { hero: 'aaron', name: 'Temper', emoji: '🔥', type: 'skill', cost: 1, rarity: 'common', src: 'StS2 Regent forge',
    text: 'Big Hammer +{n} this fight. Gain {b} Block.', fx: [{ hammerPlus: 4 }, { block: 3 }], up: { fx: [{ hammerPlus: 6 }, { block: 4 }] } },
  brace: { hero: 'aaron', name: 'Turtle Up', emoji: '🐢', type: 'skill', cost: 1, rarity: 'common', src: 'StS1 Defend+',
    text: 'Gain {b} Block.', fx: [{ block: 8 }], up: { fx: [{ block: 11 }] } },
  shoulder_charge: { hero: 'aaron', name: 'Shoulder Charge', emoji: '🏈', type: 'attack', cost: 2, rarity: 'common', src: 'StS1 Bash',
    text: 'Deal {d} damage. Make it Wide Open {n}.', fx: [{ dmg: 14 }, { status: { k: 'wideOpen', n: 1, target: 'target' } }],
    up: { fx: [{ dmg: 18 }, { status: { k: 'wideOpen', n: 2, target: 'target' } }] } },
  deep_breath: { hero: 'aaron', name: 'Deep Breath', emoji: '😤', type: 'skill', cost: 0, rarity: 'common', src: 'Original',
    text: 'Draw {n}. The next Big Hammer you play this turn costs 1 less. Used up.', fx: [{ draw: 1 }, { hammerNextDiscount: 1 }], exhausts: true,
    up: { fx: [{ draw: 2 }, { hammerNextDiscount: 1 }] } },
  iron_stance: { hero: 'aaron', name: 'Iron Stance', emoji: '🗿', type: 'skill', cost: 1, rarity: 'common', src: 'StS1 Body Slam (inverted)',
    text: 'Gain Block equal to half the Big Hammer ({hh}).', fx: [{ hammerHalf: { kind: 'block', plus: 0 } }],
    up: { fx: [{ hammerHalf: { kind: 'block', plus: 4 } }], text: 'Gain Block equal to half the Big Hammer, +4 ({hh}).' } },
  wide_swing: { hero: 'aaron', name: 'Wide Swing', emoji: '↔️', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 Cleave',
    text: 'This fight, the Big Hammer hits ALL enemies. Used up.', fx: [{ hammerAll: true }], exhausts: true, up: { cost: 0 } },
  hammer_toss: { hero: 'aaron', name: 'Hammer Toss', emoji: '🪃', type: 'attack', cost: 1, rarity: 'uncommon', src: 'Original',
    text: "Deal half the Big Hammer's damage ({hh}).", fx: [{ hammerHalf: { kind: 'dmg', plus: 0 } }],
    up: { fx: [{ hammerHalf: { kind: 'dmg', plus: 4 } }], text: "Deal half the Big Hammer's damage, +4 ({hh})." } },
  get_pumped: { hero: 'aaron', name: 'Get Pumped', emoji: '🏋️', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 Inflame',
    text: 'Gain {n} Pumped. Used up.', fx: [{ status: { k: 'pumped', n: 2, target: 'self' } }], exhausts: true,
    up: { fx: [{ status: { k: 'pumped', n: 3, target: 'self' } }] } },
  anvil: { hero: 'aaron', name: 'Anvil', emoji: '⚒️', type: 'skill', cost: 2, rarity: 'uncommon', src: 'StS2 Regent forge',
    text: 'Big Hammer +{n} this fight.', fx: [{ hammerPlus: 8 }], up: { fx: [{ hammerPlus: 12 }] } },
  bounce_back: { hero: 'aaron', name: 'Bounce Back', emoji: '🏀', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 Headbutt-ish',
    text: 'The next time you play the Big Hammer this turn, it comes right back to your hand.', fx: [{ hammerBounce: true }], up: { cost: 0 } },
  stomp: { hero: 'aaron', name: 'Stomp', emoji: '🐘', type: 'attack', cost: 1, rarity: 'uncommon', src: 'StS1 Thunderclap',
    text: 'Deal {d} damage to ALL enemies.', fx: [{ dmg: 5, allEnemies: true }], up: { fx: [{ dmg: 8, allEnemies: true }] } },
  forged_in_rolfe: { hero: 'aaron', name: 'Forged on the Farm', emoji: '🏭', type: 'power', cost: 2, rarity: 'rare', src: 'StS1 Rampage',
    text: 'Every time you play the Big Hammer, it gets +{n} for the rest of this fight.', power: 'forged', pn: 3, up: { pn: 4 } },
  titan_grip: { hero: 'aaron', name: 'Titan Grip', emoji: '🤜', type: 'power', cost: 1, rarity: 'rare', src: 'Original',
    text: 'The Big Hammer costs {n}.', power: 'titan_grip', pn: 1, up: { cost: 0 } },
  legendary_swing: { hero: 'aaron', name: 'Legendary Swing', emoji: '🌟', type: 'attack', cost: 3, rarity: 'rare', src: 'StS1 Double Tap',
    text: "Deal the Big Hammer's damage ({h}) twice. (Doesn't count as playing the Hammer.) Used up.", fx: [{ hammerTwice: true }], exhausts: true,
    up: { cost: 2 } },

  // ================= 🚽 LIAM THE POTTY TRAINED — the Potty meter =================
  toddle: { hero: 'liam', name: 'Toddle', emoji: '🧸', type: 'attack', cost: 1, rarity: 'starter', src: 'StS1 Strike',
    text: 'Deal {d} damage. +1 Potty.', fx: [{ dmg: 6 }, { potty: 1 }], up: { fx: [{ dmg: 9 }, { potty: 1 }] } },
  hide: { hero: 'liam', name: 'Hide', emoji: '🙈', type: 'skill', cost: 1, rarity: 'starter', src: 'StS1 Defend',
    text: 'Gain {b} Block. +1 Potty.', fx: [{ block: 5 }, { potty: 1 }], up: { fx: [{ block: 8 }, { potty: 1 }] } },
  sippy_cup: { hero: 'liam', name: 'Apple Juice', emoji: '🧃', type: 'skill', cost: 1, rarity: 'starter', src: 'Original',
    text: '+{p} Potty. Draw 1.', noSteal: true, fx: [{ potty: 3 }, { draw: 1 }], up: { fx: [{ potty: 4 }, { draw: 1 }] } },
  waddle: { hero: 'liam', name: 'Waddle', emoji: '🐧', type: 'skill', cost: 0, rarity: 'starter', src: 'Original',
    text: '+{p} Potty.', fx: [{ potty: 1 }], up: { fx: [{ potty: 2 }] } },

  big_gulp: { hero: 'liam', name: 'Big Gulp', emoji: '🥤', type: 'skill', cost: 1, rarity: 'common', src: 'Original',
    text: '+{p} Potty.', fx: [{ potty: 4 }], up: { fx: [{ potty: 6 }] } },
  tantrum_toss: { hero: 'liam', name: 'Tantrum Toss', emoji: '🧱', type: 'attack', cost: 1, rarity: 'common', src: 'StS1 Strike+',
    text: 'Deal {d} damage. +1 Potty.', fx: [{ dmg: 8 }, { potty: 1 }], up: { fx: [{ dmg: 11 }, { potty: 1 }] } },
  blanket_fort: { hero: 'liam', name: 'Pillow Fort', emoji: '⛺', type: 'skill', cost: 1, rarity: 'common', src: 'StS1 Defend+',
    text: 'Gain {b} Block. +1 Potty.', fx: [{ block: 8 }, { potty: 1 }], up: { fx: [{ block: 11 }, { potty: 1 }] } },
  wiggle: { hero: 'liam', name: 'Hop Hop', emoji: '🕺', type: 'skill', cost: 0, rarity: 'common', src: 'Original',
    text: '+{p} Potty.', fx: [{ potty: 1 }], up: { fx: [{ potty: 2 }] } },
  naptime: { hero: 'liam', name: 'Naptime', emoji: '😴', type: 'skill', cost: 2, rarity: 'common', src: 'StS1 Impervious-lite',
    text: 'Gain {b} Block.', fx: [{ block: 14 }], up: { fx: [{ block: 18 }] } },
  uh_oh: { hero: 'liam', name: 'Uh-Oh', emoji: '😯', type: 'attack', cost: 1, rarity: 'common', src: 'StS1 Cleave-lite',
    text: 'Deal {d} damage to ALL enemies. +1 Potty.', fx: [{ dmg: 4, allEnemies: true }, { potty: 1 }], up: { fx: [{ dmg: 6, allEnemies: true }, { potty: 1 }] } },
  hold_it: { hero: 'liam', name: 'Hold It!', emoji: '🤞', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 orb-evoke idea',
    text: 'Spend 4 Potty: gain {b} Block. (Needs 4 Potty.)', fx: [{ pottySpend: { n: 4, block: 14 } }], up: { fx: [{ pottySpend: { n: 4, block: 18 } }] } },
  potty_dance: { hero: 'liam', name: 'Potty Dance', emoji: '💃', type: 'attack', cost: 1, rarity: 'uncommon', src: 'StS1 Heavy Blade-ish',
    text: 'Deal {n} damage for every 2 Potty you have{now}. Keeps the Potty.', fx: [{ pottyDance: 3 }], up: { fx: [{ pottyDance: 4 }] } },
  double_flush: { hero: 'liam', name: 'Double Flush', emoji: '🌊', type: 'skill', cost: 2, rarity: 'uncommon', src: 'StS1 Burst',
    text: 'Your next FLUSH! this fight happens twice. Used up.', fx: [{ doubleFlush: true }], exhausts: true, up: { cost: 1 } },
  big_kid_stickers: { hero: 'liam', name: 'Big Kid Stickers', emoji: '⭐', type: 'power', cost: 1, rarity: 'uncommon', src: 'Original',
    text: 'After every FLUSH!, draw {n}.', power: 'big_kid_stickers', pn: 2, up: { pn: 3 } },
  big_boy_undies: { hero: 'liam', name: 'Big Boy Undies', emoji: '🦸', type: 'power', cost: 1, rarity: 'uncommon', src: 'Original',
    text: 'After every FLUSH!, gain {n} Pumped.', power: 'big_boy_undies', pn: 1, up: { pn: 2 } },
  splash_zone: { hero: 'liam', name: 'Splash Zone', emoji: '💦', type: 'skill', cost: 1, rarity: 'uncommon', src: 'StS1 Crippling Cloud',
    text: 'Make ALL enemies Wobbly {n}. +{p} Potty.', fx: [{ status: { k: 'wobbly', n: 1, target: 'all' } }, { potty: 2 }],
    up: { fx: [{ status: { k: 'wobbly', n: 2, target: 'all' } }, { potty: 3 }] } },
  royal_throne: { hero: 'liam', name: 'Royal Throne', emoji: '👑', type: 'power', cost: 2, rarity: 'rare', src: 'Original',
    text: 'FLUSH! deals +{n} damage.', power: 'royal_throne', pn: 10, up: { pn: 15 } },
  emergency: { hero: 'liam', name: 'Emergency!', emoji: '🚨', type: 'skill', cost: 0, rarity: 'rare', src: 'StS1 Evoke-now',
    text: 'If Potty is {n}+, FLUSH! right now. Used up.', fx: [{ emergency: 5 }], exhausts: true, up: { fx: [{ emergency: 3 }] } },
  all_by_myself: { hero: 'liam', name: 'All By Myself', emoji: '🙌', type: 'attack', cost: 2, rarity: 'rare', src: 'StS1 Skewer (X-cost idea)',
    text: 'Spend ALL your Potty: deal {n} damage for each Potty{now}.', fx: [{ pottyAll: 4 }], up: { fx: [{ pottyAll: 5 }] } },

  // ================= junk =================
  sass: { hero: null, name: 'Sass', emoji: '🙄', type: 'status', cost: null, rarity: 'status', src: 'StS1 Dazed (fight-only)',
    text: '"Whatever." Can\'t be played. Tap Say Sorry (1⚡) to toss it. Gone after the fight.', unplayable: true },
};

export const RARITY_WEIGHTS = { common: 60, uncommon: 32, rare: 8 };

export function draftPool(heroId) {
  return Object.keys(CARDS).filter((id) => CARDS[id].hero === heroId && ['common', 'uncommon', 'rare'].includes(CARDS[id].rarity));
}

// A card instance in a deck: { id, up, uid, sticker }
let uidCounter = 1;
export function makeCard(id, up = false, sticker = null) {
  return { id, up: !!up, uid: uidCounter++, sticker: sticker || null };
}
export function bumpUid(n) { if (n >= uidCounter) uidCounter = n + 1; } // after loading a save

// Resolved view of a card instance: upgrade overrides + sticker. Pure.
export function cardInfo(inst) {
  const base = CARDS[inst.id];
  if (!base) return null;
  const info = { ...base, id: inst.id, uid: inst.uid, upgraded: !!inst.up, sticker: inst.sticker || null };
  if (inst.up && base.up) Object.assign(info, base.up);
  if (inst.up) info.name = `${info.name}+`;
  if (info.sticker) applySticker(info, info.sticker);
  return info;
}

// Sticker effects on the resolved card (DESIGN.md §5 + §13). One sticker per card.
function applySticker(info, sid) {
  if (sid === 'sparkle') {
    const di = firstDmgIdx(info);
    if (di >= 0) info.fx = info.fx.map((o, i) => (i === di ? { ...o, stickerDmg: 3 } : o));
  }
  if (sid === 'heart') {
    const bi = (info.fx || []).findIndex((o) => o.block != null || o.pottySpend);
    if (bi >= 0) {
      info.fx = info.fx.map((o, i) => {
        if (i !== bi) return o;
        if (o.pottySpend) return { ...o, pottySpend: { ...o.pottySpend, block: o.pottySpend.block + 3 } };
        return { ...o, block: o.block + 3 };
      });
    }
  }
  if (sid === 'star') info.innate = true;
  if (sid === 'lightning' && typeof info.cost === 'number' && info.cost >= 2) info.cost = Math.max(1, info.cost - 1);
  if (sid === 'rainbow') { info.fx = [...(info.fx || []), { draw: 1, fromSticker: true }]; info.rainbow = true; }
  if (sid === 'smiley') info.retain = true;
}
export function firstDmgIdx(info) {
  return (info.fx || []).findIndex((o) => o.dmg != null || o.hammerSwing || o.hammerHalf?.kind === 'dmg'
    || o.hammerTwice || o.pottyDance != null || o.pottyAll != null);
}

export function upgradableCards(deck) {
  return deck.filter((c) => !c.up && CARDS[c.id] && CARDS[c.id].up);
}

// The value a card's {n} placeholder stands for (a test asserts every {n} resolves).
export function nValue(info) {
  if (info.pn != null) return info.pn;
  const walk = (fx) => {
    for (const o of fx || []) {
      if (o.status) return Math.abs(o.status.n);
      if (o.draw != null && !o.fromSticker) return o.draw;
      if (o.hammerPlus != null) return o.hammerPlus;
      if (o.dmgPerMomentum != null) return o.dmgPerMomentum;
      if (o.relay != null) return o.relay;
      if (o.pottyDance != null) return o.pottyDance;
      if (o.pottyAll != null) return o.pottyAll;
      if (o.emergency != null) return o.emergency;
    }
    return null;
  };
  return walk(info.fx);
}
export function pottyValue(info) {
  const o = (info.fx || []).find((x) => x.potty != null);
  return o ? o.potty : null;
}
