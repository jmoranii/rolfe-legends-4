// Rolfe Legends 4 — money pets (Aaron's idea: "something that makes you money").
// Pets don't fight; they earn coins after every fight you win (DESIGN.md §5, §13).
// Each pet comes from one world and restyles with the world like everything else.

export const PET_TIERS = {
  common: { earn: 3, label: 'Common' },
  rare:   { earn: 5, label: 'Rare' },
  super:  { earn: 7, label: 'SUPER' },
};
export const PET_GROWTH_AFTER = 5;  // fights with you → +1 earning, once
export const PET_SLOTS = 3;

export const PETS = {
  // World 1 — Barbie Dreamhouse
  pink_poodle:   { name: 'Pink Poodle', emoji: '🐩', world: 1, tier: 'common', line: 'Fluffy, fabulous, and somehow always holding a coin.' },
  pony_pal:      { name: 'Pony Pal', emoji: '🦄', world: 1, tier: 'rare', line: 'A sparkly pony who finds coins in the carpet.' },
  glitter_kitten:{ name: 'Glitter Kitten', emoji: '🐱', world: 1, tier: 'common', line: 'Leaves a trail of glitter… and pennies.' },
  dream_bunny:   { name: 'Dream Bunny', emoji: '🐰', world: 1, tier: 'super', line: 'Hops into the Dreamhouse bank and hops out richer.' },
  // World 2 — the squishy world
  squishy_kitten:{ name: 'Squishy Kitten', emoji: '😺', world: 2, tier: 'common', line: 'Squeeze it and a coin pops out. Every time.' },
  dumpling_pup:  { name: 'Dumpling Pup', emoji: '🐶', world: 2, tier: 'common', line: 'A puppy shaped like a dumpling. Loves fetch. Fetches coins.' },
  jelly_turtle:  { name: 'Jelly Turtle', emoji: '🐢', world: 2, tier: 'rare', line: 'Slow. Squishy. Surprisingly good with money.' },
  mochi_hamster: { name: 'Mochi Hamster', emoji: '🐹', world: 2, tier: 'super', line: 'Stuffs its cheeks with coins, then shares.' },
  // World 3 — the sassy tea party
  teacup_pig:    { name: 'Teacup Pig', emoji: '🐷', world: 3, tier: 'common', line: 'Tiny pig. Tiny teacup. Big savings.' },
  fancy_parrot:  { name: 'Fancy Parrot', emoji: '🦜', world: 3, tier: 'rare', line: 'Says "Pretty please" and people just give it coins.' },
  lace_lamb:     { name: 'Lace Lamb', emoji: '🐑', world: 3, tier: 'common', line: 'Wears a doily. Collects coins politely.' },
  royal_corgi:   { name: 'Royal Corgi', emoji: '🐕', world: 3, tier: 'super', line: 'Has a crown AND a coin purse.' },
};

export function petsOf(world, tier) {
  return Object.keys(PETS).filter((id) => PETS[id].world === world && (!tier || PETS[id].tier === tier));
}

// earning for one owned pet { id, fights }
export function petEarn(p) {
  const def = PETS[p.id];
  if (!def) return 0;
  return PET_TIERS[def.tier].earn + (p.fights >= PET_GROWTH_AFTER ? 1 : 0);
}
