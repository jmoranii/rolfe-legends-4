// Rolfe Legends 4 — Delilah's Tea Party Rules (World 3). Pure.
// Every World-3 fight shows ONE manners rule on a banner before your first turn;
// it never changes mid-turn (Delilah announces hers a turn early). Breaking a rule
// is always allowed: the card glows "breaks the rule!" first, and breaking it
// shuffles one Sass card into your draw pile (fight-only, max 3 at a time).
// Only ATTACK CARDS' damage counts; triggered damage (FLUSH!, powers) never breaks a rule.

export const TEA_RULES = {
  pinkies_out:  { name: 'Pinkies Out!', emoji: '🫖', text: 'No more than ONE big attack card (over 12 damage) per turn.' },
  inside_voices:{ name: 'Inside Voices!', emoji: '🤫', text: 'No more than 6 cards in one turn.' },
  no_elbows:    { name: 'No Elbows on the Table!', emoji: '💪', text: 'No more than one Block card on your first turn.' },
  take_turns:   { name: 'Take Turns!', emoji: '🔄', text: 'No two attack cards in a row.' },
  clean_plate:  { name: 'Clean Your Plate!', emoji: '🍽️', text: "Don't end your turn with 2 or more ⚡ left over." },
};
export const RULE_IDS = Object.keys(TEA_RULES);
export const SASS_CAP = 3;

// Would playing this card (info, with its computed damage per target `dmg`) break the
// current rule? Pure: reads only the turn counters on state.
export function wouldBreakRule(state, info, dmg) {
  const r = state.rule;
  if (!r) return false;
  const isAttack = info.type === 'attack';
  const isBlock = (info.fx || []).some((o) => o.block != null || o.pottySpend || o.hammerHalf?.kind === 'block');
  switch (r) {
    case 'pinkies_out': return isAttack && dmg > 12 && (state.bigAttacksThisTurn || 0) >= 1;
    case 'inside_voices': return (state.cardsThisTurn || 0) >= 6;
    case 'no_elbows': return state.turn === 1 && isBlock && (state.blockCardsThisTurn || 0) >= 1;
    case 'take_turns': return isAttack && state.lastCardWasAttack === true;
    default: return false; // clean_plate is checked at END TURN
  }
}
export function breaksAtEndTurn(state) {
  return state.rule === 'clean_plate' && state.hero.energy >= 2;
}
