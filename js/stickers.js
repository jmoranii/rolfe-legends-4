// Rolfe Legends 4 — stickers (StS2 card enchantments, kid version). Pure.
// One sticker per card, for the whole run (DESIGN.md §5, §13). cardInfo() in
// cards.js applies the effect; this file owns the catalog and the legality rules.

import { CARDS } from './cards.js';

export const STICKERS = {
  sparkle:   { name: 'Sparkle Sticker', emoji: '✨', text: '+3 damage.', on: 'attacks' },
  heart:     { name: 'Heart Sticker', emoji: '❤️', text: '+3 Block.', on: 'block cards' },
  star:      { name: 'Star Sticker', emoji: '⭐', text: 'Starts in your opening hand.', on: 'any card' },
  lightning: { name: 'Lightning Sticker', emoji: '⚡', text: 'Costs 1 less (never below 1).', on: 'cards costing 2+' },
  rainbow:   { name: 'Rainbow Sticker', emoji: '🌈', text: 'When you play it, draw 1.', on: 'cards costing 1+' },
  smiley:    { name: 'Smiley Sticker', emoji: '😊', text: 'If you don\'t play it, it stays in your hand for next turn.', on: 'any card' },
};
export const STICKER_IDS = Object.keys(STICKERS);
export const STICKER_PRICE = 50;

function hasBlock(base) {
  return (base.fx || []).some((o) => o.block != null || o.pottySpend || (o.ifMomentum && o.ifMomentum.fx.some((x) => x.block != null)));
}
function dealsDamage(base) {
  return (base.fx || []).some((o) => o.dmg != null || o.hammerSwing || o.hammerHalf?.kind === 'dmg' || o.hammerTwice
    || o.pottyDance != null || o.pottyAll != null);
}

// Can sticker `sid` go on card instance `inst`? Returns true or a kid-readable reason.
export function canSticker(inst, sid) {
  const base = CARDS[inst.id];
  if (!base || base.unplayable || base.type === 'status') return 'Stickers only go on real cards.';
  if (inst.sticker) return 'That card already has a sticker. One per card!';
  const cost = inst.up && base.up && base.up.cost != null ? base.up.cost : base.cost;
  switch (sid) {
    case 'sparkle': return dealsDamage(base) ? true : 'Sparkle only goes on cards that deal damage.';
    case 'heart': return hasBlock(base) ? true : 'Heart only goes on cards that give Block.';
    case 'lightning': return typeof cost === 'number' && cost >= 2 ? true : 'Lightning only goes on cards that cost 2 or more.';
    case 'rainbow': return typeof cost === 'number' && cost >= 1 ? true : 'Rainbow only goes on cards that cost 1 or more.';
    case 'star': case 'smiley': return true;
    default: return 'Unknown sticker.';
  }
}
