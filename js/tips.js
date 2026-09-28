// Rolfe Legends 4 — Coach James's tip library (victory beats) + loss lines.
// Per-hero tips only show for that hero. Copy is listed in REVIEW.md for James's pass.

export const TIPS_GENERAL = [
  'Look at the bubble over each enemy — it tells you EXACTLY what it will do next.',
  'Block only lasts one turn. Block when a big hit is coming, attack when it isn\'t.',
  'Money pets pay you after EVERY fight you win. More pets, more coins.',
  'A tough fight (💀) always drops a money pet. Risky… but worth it.',
  'The Arena costs coins to enter, but the prize is a SUPER pet or a rare card.',
  'Stickers stay on a card for the whole run. Put your best sticker on your best card!',
  'Removing weak cards makes your good cards show up more often.',
  'Tap anything you don\'t understand — every chip and bubble explains itself.',
  'Squishy enemies soak up the first bit of damage each turn. Save up for one BIG turn!',
  'In the Tea Party, a card that would break the rule glows orange first. Your call!',
  'Got a Sass card? Tap it and Say Sorry for 1 ⚡ to toss it.',
  'Your whole deck travels with you to the next world — every card you pick matters.',
];
export const TIPS_HERO = {
  wyatt: [
    'Momentum goes up with EVERY card you play this turn. Play the cheap cards first!',
    'Cards that say "Momentum 3+" get way better as your third, fourth, fifth card.',
    'Photo Finish gets cheaper the faster you go. Save it for the end of a big turn.',
  ],
  aaron: [
    'Make the Big Hammer bigger BEFORE you swing it — Sharpen, Temper, Anvil!',
    'Wide Swing makes the Big Hammer hit EVERY enemy for the rest of the fight.',
    'Iron Stance turns a huge hammer into huge Block.',
  ],
  liam: [
    'Watch the Potty meter. When it hits 10… FLUSH! It hits every enemy.',
    'Hold It! spends Potty for a big shield — sometimes that beats flushing.',
    'Royal Throne makes every FLUSH! hit even harder.',
  ],
};
let tipIdx = 0;
export function nextTip(hero) {
  const pool = [...TIPS_GENERAL, ...(TIPS_HERO[hero] || []), ...(TIPS_HERO[hero] || [])];
  return pool[tipIdx++ % pool.length];
}

export const LOSS_LINES = [
  'Every legend loses a few. Shake it off — the cousins won\'t know what hit them next time.',
  'That was close! Try a different path, or a different hero.',
  'Remember what beat you. Next time, you\'ll see it coming.',
  'Rest up, champ. The Dreamhouse will still be pink tomorrow.',
];
let lossIdx = 0;
export function nextLossLine() { return LOSS_LINES[lossIdx++ % LOSS_LINES.length]; }
