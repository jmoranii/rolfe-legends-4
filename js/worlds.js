// Rolfe Legends 4 — the three worlds: names, rooms, encounters, Arenas, visitors.
// Pure data. Each world has its own LOOK (js/skins.js), its own challenge, its own
// enemies, its own shop/rest/treasure dressing, and a themed Arena (Aaron's idea).

export const WORLDS = {
  1: {
    id: 'w1', name: 'The Barbie Dreamhouse', short: 'Dreamhouse', emoji: '🏠', cousin: 'stella', boss: 'Stella, Queen of Barbies',
    challenge: 'Enemies here hit a LOT — Block matters!',
    rooms: {
      fight: { ico: '⚔️', name: 'Trouble in the Dreamhouse', desc: 'Something plastic wants to fight.' },
      elite: { ico: '💀', name: 'BIG Trouble', desc: 'A tough fight — and it always drops a money pet.' },
      shop: { ico: '👗', name: "Stella's Closet", desc: 'Buy cards, stickers, or get rid of a card.' },
      rest: { ico: '🏊', name: 'The Pool', desc: 'Rest (heal) or Practice (upgrade a card).' },
      treasure: { ico: '🧸', name: 'The Toy Box', desc: 'A treasure is inside!' },
      arena: { ico: '🎟️', name: 'The Fashion Show (Arena)', desc: 'Pay to enter. Three waves. A SUPER prize.' },
      boss: { ico: '👑', name: 'STELLA', desc: 'The Queen of Barbies waits at the top of the stairs.' },
    },
    story: { sub: 'You got plunged into a giant Barbie Dreamhouse!', line: 'Everything is pink, shiny, and plastic — and Stella, the Queen of Barbies, rules it all.' },
    encounters: {
      easy: [['pink_pony'], ['shoe_stampede'], ['mannequin', 'mannequin', 'mannequin']],
      hard: [['convertible'], ['hairbrush_hydra'], ['pink_pony', 'shoe_stampede'], ['convertible', 'mannequin']],
      elite: [['makeover_mirror'], ['closet_monster']],
      boss: [['stella']],
    },
    arena: { fee: 25, name: 'The Fashion Show', waves: [
      { enemies: ['mannequin', 'mannequin', 'mannequin'] },
      { enemies: ['pink_pony', 'shoe_stampede'] },
      { enemies: ['runway_diva'] },
    ] },
    visitor: { who: 'Grandma Rockie', art: 'grandma_rockie', emoji: '👵',
      line: '"Well, look at this place! Pink as a flamingo. Here, sweetie — pick one. Grandma always brings something."',
      offers: ['maxhp10', 'rare_pick', 'remove2'] },
  },
  2: {
    id: 'w2', name: 'Inside the Giant Squishy', short: 'Squishy', emoji: '🫧', cousin: 'lucy', boss: 'Lucy, Ruler of Squishies',
    challenge: 'Squishy enemies soak up the first bit of damage each turn — save up for BIG turns!',
    rooms: {
      fight: { ico: '⚔️', name: 'Squishy Trouble', desc: 'A squishy toy wants to fight.' },
      elite: { ico: '💀', name: 'BIG Squishy Trouble', desc: 'A tough fight — and it always drops a money pet.' },
      shop: { ico: '🧺', name: "Lucy's Squish Stand", desc: 'Buy cards, stickers, or get rid of a card.' },
      rest: { ico: '🛋️', name: 'The Squishy Cushion', desc: 'Rest (heal) or Practice (upgrade a card).' },
      treasure: { ico: '🎰', name: 'The Capsule Machine', desc: 'A treasure pops out!' },
      arena: { ico: '🎟️', name: 'The Squeeze Race (Arena)', desc: 'Pay to enter. Three waves. A SUPER prize.' },
      boss: { ico: '🫧', name: 'LUCY', desc: 'Squeeze out… and she\'s waiting.' },
    },
    story: { sub: 'Uh-oh. You got SWALLOWED by a giant squishy!', line: 'Fight your way through the squishy toys, squeeze out the other side… Lucy is waiting.' },
    encounters: {
      easy: [['squishy_dumpling', 'squishy_dumpling', 'squishy_dumpling'], ['gumdrop_needoh'], ['teenie_needoh', 'teenie_needoh', 'teenie_needoh', 'teenie_needoh', 'teenie_needoh']],
      hard: [['stretchy_monkey'], ['cube_needoh'], ['mesh_squish_ball'], ['splat_ball', 'sticky_hand'], ['gumdrop_needoh', 'sticky_hand']],
      elite: [['king_needoh'], ['water_bead_ball']],
      boss: [['lucy']],
    },
    arena: { fee: 40, name: 'The Squeeze Race', waves: [
      { enemies: ['teenie_needoh', 'teenie_needoh', 'teenie_needoh', 'teenie_needoh', 'teenie_needoh'] },
      { enemies: ['stretchy_monkey', 'sticky_hand'] },
      { enemies: ['mega_stress_ball'] },
    ] },
    visitor: { who: 'Grampa Flaj', art: 'grampa_flaj', emoji: '👴',
      line: '"Whoa-ho! Everything\'s bouncy in here! Careful, kiddo. Pick one of these — they\'ll help."',
      offers: ['upgrade3', 'super_pet', 'treasure'] },
  },
  3: {
    id: 'w3', name: "Delilah's Sassy Tea Party", short: 'Tea Party', emoji: '🫖', cousin: 'delilah', boss: 'Delilah the Sassafras',
    challenge: 'Tea Party Rules! Break the rule and you get a Sass card.',
    rooms: {
      fight: { ico: '⚔️', name: 'Tea Party Trouble', desc: 'Something fancy wants to fight.' },
      elite: { ico: '💀', name: 'BIG Tea Party Trouble', desc: 'A tough fight — and it always drops a money pet.' },
      shop: { ico: '🧁', name: "Delilah's Sweet Shop", desc: 'Buy cards, stickers, or get rid of a card.' },
      rest: { ico: '🛋️', name: 'The Fainting Couch', desc: 'Rest (heal) or Practice (upgrade a card).' },
      treasure: { ico: '🎂', name: 'The Cake Stand', desc: 'A treasure is on the top tier!' },
      arena: { ico: '🎟️', name: 'The Etiquette Exam (Arena)', desc: 'Pay to enter. Three waves, three rules. A SUPER prize.' },
      boss: { ico: '💅', name: 'DELILAH', desc: 'The littlest cousin. The sassiest boss.' },
    },
    story: { sub: 'Welcome to the fanciest tea party EVER.', line: 'Pinkies out. Manners on. Delilah makes the rules — and she changes them whenever she wants.' },
    encounters: {
      easy: [['spoon_knight'], ['snooty_teacup', 'snooty_teacup', 'snooty_teacup', 'snooty_teacup'], ['rude_scone']],
      hard: [['teapot_tantrum'], ['sugar_cube', 'sugar_cube'], ['rude_scone', 'spoon_knight'], ['teapot_tantrum', 'snooty_teacup', 'snooty_teacup']],
      elite: [['bunny_guest', 'teddy_in_a_tiara', 'dino_guest'], ['tea_time_clock']],
      boss: [['delilah']],
    },
    arena: { fee: 60, name: 'The Etiquette Exam', waves: [
      { enemies: ['spoon_knight', 'snooty_teacup', 'snooty_teacup'], rule: 'take_turns' },
      { enemies: ['sugar_cube', 'sugar_cube'], rule: 'pinkies_out' },
      { enemies: ['headmistress_teapot'], rule: 'inside_voices' },
    ] },
    visitor: { who: 'Mom and Dad', art: 'mom_dad', emoji: '👨‍👩‍👦',
      line: '"We are SO proud of you. Last stretch, bud. Pick one — then go show her who\'s boss."',
      offers: ['heal_full', 'boss_treasure2', 'duplicate'] },
  },
};
export const WORLD_COUNT = 3;

export const VISITOR_OFFERS = {
  maxhp10: { label: '❤️ +10 max HP', emoji: '❤️' },
  rare_pick: { label: '🌟 Choose a rare card (from 3)', emoji: '🌟' },
  remove2: { label: '✂️ Remove 2 starter cards', emoji: '✂️' },
  upgrade3: { label: '⭐ Upgrade 3 cards of your choice', emoji: '⭐' },
  super_pet: { label: '🐾 A SUPER money pet', emoji: '🐾' },
  treasure: { label: '🎁 A random treasure', emoji: '🎁' },
  heal_full: { label: '💖 Heal all the way up', emoji: '💖' },
  boss_treasure2: { label: '👑 A boss treasure (choose from 2)', emoji: '👑' },
  duplicate: { label: '👯 Copy one card in your deck', emoji: '👯' },
};
