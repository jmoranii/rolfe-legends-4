// Rolfe Legends 4 — treasures (relics). Pure data; combat.js / run.js implement hooks.
// All new for RL4 (no-port rule). DESIGN.md §3 (starters) and §5 (pool + boss treasures).

export const TREASURES = {
  // hero starters
  stopwatch:     { name: 'Stopwatch', emoji: '⏱️', starter: 'wyatt', text: 'The first time you reach 4 Momentum in a fight, gain 1 ⚡.' },
  weight_belt:   { name: 'Weight Belt', emoji: '🥋', starter: 'aaron', text: 'The first time the Big Hammer hits each fight, gain 6 Block.' },
  sticker_chart: { name: 'Sticker Chart', emoji: '📋', starter: 'liam', text: 'The first FLUSH! each fight earns a gold star: +5 coins.' },

  // the pool (treasure rooms, tough fights)
  pink_car_keys:     { name: 'Pink Car Keys', emoji: '🔑', text: '+1 ⚡ on your first turn of every fight.' },
  squishy_pillow:    { name: 'Squishy Pillow', emoji: '🛏️', text: 'Start every fight with 8 Block.' },
  teacup_of_courage: { name: 'Teacup of Courage', emoji: '🍵', text: 'Heal 3 HP after every fight.' },
  scrunchie:         { name: 'Scrunchie', emoji: '🎀', text: 'The first card you play each fight costs 0.' },
  glitter_jar:       { name: 'Glitter Jar', emoji: '🫙', text: 'The first time you drop below half HP in a fight, gain 10 Block.' },
  pinky_promise:     { name: 'Pinky Promise', emoji: '🤙', text: 'Start every fight with 1 Pumped.' },
  juice_box_straw:   { name: 'Juice Box Straw', emoji: '🧃', text: 'Every 3rd turn of a fight, gain 1 ⚡.' },
  piggy_bank:        { name: 'Piggy Bank', emoji: '🐷', text: '+50 coins right now.' },
  bubble_wand:       { name: 'Bubble Wand', emoji: '🫧', text: 'At the start of every fight, all enemies are Wobbly 1.' },
  lucky_penny:       { name: 'Lucky Penny', emoji: '🪙', text: 'Card rewards show 4 choices instead of 3.' },

  // boss treasures (pick 1 of 3 after Stella and after Lucy)
  stellas_crown:      { name: "Stella's Crown", emoji: '👑', boss: true, text: '+1 ⚡ every turn. No catch!' },
  lucys_mega_squishy: { name: "Lucy's Mega Squishy", emoji: '🟣', boss: true, text: 'Gain 6 Block at the start of every turn.' },
  golden_pet_collar:  { name: 'Golden Pet Collar', emoji: '🦮', boss: true, text: '+1 pet slot (carry 4 money pets).' },
  sticker_pack:       { name: 'Sticker Pack', emoji: '🗂️', boss: true, text: '3 free stickers (still one per card).' },
  party_hat:          { name: 'Party Hat', emoji: '🥳', boss: true, text: 'Draw 1 extra card every turn.' },
};

export function treasurePool(owned) {
  return Object.keys(TREASURES).filter((id) => !TREASURES[id].starter && !TREASURES[id].boss && !owned.includes(id));
}
export function bossTreasurePool(owned) {
  return Object.keys(TREASURES).filter((id) => TREASURES[id].boss && !owned.includes(id));
}
