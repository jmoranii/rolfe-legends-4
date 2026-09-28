// Rolfe Legends 4 — card text (pure). Fills {d} {b} {n} {p} {h} {hh} placeholders.
// With a live combat state the numbers are LIVE (Pumped/Wobbly, Momentum, the Big
// Hammer's current size, the Potty meter) and a changed number is marked up/down —
// the StS trick that makes buffs visibly matter. Plain-words only (Polish floor 15).

import { nValue, pottyValue, firstDmgIdx } from './cards.js';
import { STICKERS } from './stickers.js';
import * as C from './combat.js';

function mark(live, base, markup) {
  if (!markup || live === base) return String(live);
  return `<b class="${live > base ? 'val-up' : 'val-down'}">${live}</b>`;
}

export function cardText(info, state = null, { markup = true } = {}) {
  const fx = info.fx || [];
  const di = firstDmgIdx(info);
  const dmgOp = di >= 0 ? fx[di] : null;
  const blockOp = fx.find((o) => o.block != null) || fx.find((o) => o.pottySpend);
  const baseBlock = blockOp ? (blockOp.block ?? blockOp.pottySpend.block) : null;
  const hammerNow = state ? C.hammerDamage(state) : (info.hammerBase || 12);
  // {d}: the card's damage per hit (live: Pumped/Wobbly/Momentum/Potty/Hammer)
  let dText = '?';
  if (dmgOp) {
    const baseD = dmgOp.dmg != null ? dmgOp.dmg + (dmgOp.stickerDmg || 0) : null;
    if (state) {
      let live = null;
      if (dmgOp.dmg != null) live = C.attackValue(dmgOp.dmg + (dmgOp.stickerDmg || 0) + (dmgOp.dmgPerMomentum || 0) * (state.momentum + 1), state.hero);
      else if (dmgOp.pottyDance != null) live = C.attackValue(Math.floor(state.potty / 2) * dmgOp.pottyDance + (dmgOp.stickerDmg || 0), state.hero);
      else if (dmgOp.pottyAll != null) live = C.attackValue(state.potty * dmgOp.pottyAll + (dmgOp.stickerDmg || 0), state.hero);
      else if (dmgOp.hammerHalf) live = C.attackValue(Math.floor(hammerNow / 2) + dmgOp.hammerHalf.plus + (dmgOp.stickerDmg || 0), state.hero);
      dText = live == null ? '?' : mark(live, baseD ?? live, markup);
    } else if (dmgOp.dmg != null) dText = String(baseD);
    else if (dmgOp.pottyDance != null || dmgOp.pottyAll != null) dText = 'more with more Potty';
    else if (dmgOp.hammerHalf) dText = String(Math.floor((info.hammerBase || 12) / 2) + dmgOp.hammerHalf.plus);
  }
  const hText = state ? mark(C.attackValue(hammerNow, state.hero), info.hammerBase || 12, markup) : String(hammerNow + (info.hammerSticker || 0));
  const hhOp = fx.find((o) => o.hammerHalf);
  const hhVal = hhOp ? Math.floor(hammerNow / 2) + hhOp.hammerHalf.plus : '?';
  // {now}: the live total, only during a fight ("right now: 12"); nothing on reward/shop screens
  const nowText = state && dmgOp ? ` (right now: ${dText})` : '';
  let body = (info.text || '')
    .replace('{now}', nowText)
    .replace('{d}', dText)
    .replace('{b}', baseBlock == null ? '?' : String(baseBlock))
    .replace('{n}', String(nValue(info) ?? '?'))
    .replace('{p}', String(pottyValue(info) ?? '?'))
    .replace('{hh}', String(hhVal))
    .replace('{h}', hText);
  if (info.type === 'power') body += ' Lasts the whole fight!';
  if (info.innate && !info.signature) body += ' Starts in your opening hand.';
  if (info.signature) body += ' Always in your first hand.';
  if (info.sticker && STICKERS[info.sticker]) body += ` <span class="stk-line">${STICKERS[info.sticker].emoji} ${STICKERS[info.sticker].text}</span>`;
  return body;
}

export function plainText(info, state = null) {
  return cardText(info, state, { markup: false }).replace(/<[^>]*>/g, '');
}
