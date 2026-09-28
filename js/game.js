// Rolfe Legends 4: Attack of the Cousins — UI layer. Renders the pure engine
// (combat.js / run.js) and the world looks (skins.js): title → hero → the farm →
// plunged into World 1 → visitor → map → fights, shops, the Arena → cousin boss →
// the world-jump → … → Delilah → Wyatt's ending → the song. Art + music are drop-in
// (emoji / silence fallbacks). Design: DESIGN.md · build rules: CLAUDE.md, GOAL.md.

import { makeRng, randomSeed } from './rng.js';
import { HEROES, CARDS, cardInfo, makeCard, upgradableCards, HAMMER_ID, POTTY_MAX } from './cards.js';
import { cardText } from './text.js';
import { TREASURES } from './treasures.js';
import { STICKERS, STICKER_IDS, canSticker } from './stickers.js';
import { PETS, PET_TIERS, petEarn } from './pets.js';
import { TEA_RULES } from './rules.js';
import { WORLDS, WORLD_COUNT, VISITOR_OFFERS } from './worlds.js';
import * as C from './combat.js';
import * as R from './run.js';
import { MAP_FLOORS, BOSS_ID } from './map.js';
import { ENEMIES } from './enemies.js';
import * as SK from './skins.js';
import * as SC from './scenes.js';
import { sfx, setEnabled as setSfx, isEnabled as sfxOn } from './sfx.js';
import * as music from './music.js';
import { creditsRoll } from './credits.js';
import { prefetch } from './prefetch.js';
import { nextTip, nextLossLine } from './tips.js';

const $app = document.getElementById('app');
const SAVE_KEY = 'rl4_run';
const PROFILE_KEY = 'rl4_profile';
const TIPS_KEY = 'rl4_tips';
const SEENFX_KEY = 'rl4_seenfx';
const ANIM_KEY = 'rl4_anim';

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let animMode = safeGet(ANIM_KEY) || 'slow';
function fxScale() { return REDUCED ? 0.01 : (animMode === 'fast' ? 0.55 : 1.9); }
function stepMs() { return REDUCED ? 30 : (animMode === 'fast' ? 420 : 1350); }
function applyFxScale() { document.documentElement.style.setProperty('--fx', String(REDUCED ? 0.01 : fxScale())); }
applyFxScale();

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: play on, no save */ } }
function safeDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

let run = null;
let combat = null;
let combatKind = 'fight';
let selectedCard = null;
let prevSnap = null;

// ---------- profile & save ----------
function loadProfile() {
  try { const p = JSON.parse(safeGet(PROFILE_KEY)); if (p && p.wins) return { sassMax: 0, movies: {}, ...p }; } catch { /* fresh */ }
  return { wins: {}, sassMax: 0, movies: {} };
}
function saveProfile(p) { safeSet(PROFILE_KEY, JSON.stringify(p)); }
function saveRun() { if (run) safeSet(SAVE_KEY, R.serializeRun(run)); }
function clearSave() { safeDel(SAVE_KEY); }
function markMovie(k) { const p = loadProfile(); p.movies[k] = 1; saveProfile(p); }

// ---------- tiny dom helpers ----------
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function curLook() { return SK.lookFor(run); }
function screen(extra = '') {
  $app.innerHTML = '';
  document.querySelectorAll('.coach-bubble').forEach((b) => b.remove());
  resetTips();
  const s = el('div', `screen look-${curLook()} ${extra} screen-enter`);
  $app.appendChild(s);
  return s;
}
let $toasts = null;
function toast(msg, ms = 2600) {
  if (!$toasts || !$toasts.isConnected) { $toasts = el('div', 'toast-stack'); document.body.appendChild($toasts); }
  const words = String(msg).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  const dur = Math.min(9000, Math.max(ms, 2600, words * 320)); // the boys read slowly; a tap dismisses
  const t = el('div', 'toast', msg);
  const dismiss = () => { if (!t.isConnected) return; t.classList.add('gone'); setTimeout(() => t.remove(), 260); };
  t.onclick = dismiss;
  $toasts.appendChild(t);
  setTimeout(dismiss, dur);
}
function modal(title, buildFn, { dismissable = true } = {}) {
  const veil = el('div', `modal-veil look-${curLook()}`);
  const m = el('div', 'modal');
  if (title) m.appendChild(el('h2', '', title));
  veil.appendChild(m);
  if (dismissable) veil.addEventListener('click', (ev) => { if (ev.target === veil) veil.remove(); });
  document.body.appendChild(veil);
  buildFn(m, () => veil.remove());
  return veil;
}

// ---------- drop-in art: try each path in order, then the emoji ----------
const missingArt = new Map();
const MISSING_RETRY_MS = 12000;
function artImg(paths, emoji, cls = '') {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  const wrap = el('span', `art-slot ${cls}`);
  const usable = list.filter((p) => { const f = missingArt.get(p); return !f || Date.now() - f >= MISSING_RETRY_MS; });
  if (!usable.length) { wrap.textContent = emoji; wrap.classList.add('art-emoji'); return wrap; }
  const img = document.createElement('img');
  img.alt = ''; img.draggable = false;
  let i = 0;
  img.onload = () => missingArt.delete(usable[i]);
  img.onerror = () => {
    missingArt.set(usable[i], Date.now());
    i += 1;
    if (i < usable.length) img.src = usable[i];
    else { img.remove(); wrap.textContent = emoji; wrap.classList.add('art-emoji'); }
  };
  img.src = usable[0];
  wrap.appendChild(img);
  return wrap;
}
function bgLayer(paths, cls = 'scene-bg') {
  const d = el('div', cls);
  d.dataset.bg = '';
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  const tryAt = (i) => {
    if (i >= list.length) return;
    const p = list[i];
    const f = missingArt.get(p);
    if (f && Date.now() - f < MISSING_RETRY_MS) return tryAt(i + 1);
    const probe = new Image();
    probe.onload = () => { missingArt.delete(p); d.style.backgroundImage = `url("${p}")`; d.classList.add('has-art'); };
    probe.onerror = () => { missingArt.set(p, Date.now()); tryAt(i + 1); };
    probe.src = p;
  };
  tryAt(0);
  return d;
}

// ---------- the card face (every card surface uses this; world look aware) ----------
function cardFace(inst, { look = curLook(), mini = false, live = false, price = null, extraCls = '' } = {}) {
  const info = cardInfo(inst);
  const st = live ? combat : null;
  const cost = st ? C.effectiveCost(st, inst) : info.cost;
  const d = el('div', `${mini ? 'mini-card' : 'card'} cardface look-${look} type-${info.type} rarity-${info.rarity}${info.upgraded ? ' upgraded' : ''} ${extraCls}`);
  if (cost !== null && cost !== undefined) {
    const costEl = el('div', 'cost', String(cost));
    if (st && cost < info.cost) costEl.classList.add('cost-down');
    if (st && cost > info.cost) costEl.classList.add('cost-up');
    d.appendChild(costEl);
  }
  d.appendChild(artImg(SK.cardArt(inst.id, look), info.emoji, 'card-art'));
  d.appendChild(el('div', 'cnm', info.name));
  d.appendChild(el('div', 'ctx', cardText(info, st)));
  if (inst.sticker && STICKERS[inst.sticker]) d.appendChild(el('div', 'stk', STICKERS[inst.sticker].emoji));
  if (st && st.slimed.includes(inst.uid) && !info.signature) d.classList.add('slimed');
  if (st && st.relayFree.includes(inst.uid)) d.appendChild(el('div', 'card-tag tag-free', 'FREE'));
  if (price != null) d.appendChild(el('div', 'price-tag', `💰${price}`));
  return d;
}
function sceneDeps() { return { el, artImg, bgLayer, sfx, REDUCED, fxScale, cardFace: (c, o) => cardFace(c, o) }; }

// A stop screen: the place/person as a painted banner, choices beneath, with
// decision support (HP · coins · pets · deck) on every stop.
function sceneScreen(artPaths, emoji, titleText) {
  const s = screen('scene-screen');
  const banner = el('div', 'scene-banner');
  banner.appendChild(artImg(artPaths, emoji, 'scene-banner-art'));
  banner.appendChild(el('div', 'scene-banner-shade'));
  banner.appendChild(el('h2', 'scene-banner-title', titleText));
  s.appendChild(banner);
  const body = el('div', 'scene-body');
  if (run) body.appendChild(statusStrip());
  s.appendChild(body);
  return body;
}
function statusStrip() {
  const strip = el('div', 'scene-status');
  strip.appendChild(el('span', 'scene-stat stat-hp', `❤️ ${run.hp}/${run.maxHp}`));
  strip.appendChild(el('span', 'scene-stat stat-gold', `💰 ${run.coins}`));
  if (run.pets.length) {
    const pets = el('button', 'scene-stat pilebtn', `🐾 ${run.pets.length}/${run.petSlots}`);
    pets.onclick = showPetsModal;
    strip.appendChild(pets);
  }
  const deckB = el('button', 'pilebtn', `🎴 My Deck (${run.deck.length})`);
  deckB.onclick = () => showDeckModal(run.deck);
  strip.appendChild(deckB);
  return strip;
}

// ---------- Coach James: one tip per moment, never twice ----------
function tipsSeen() { try { return JSON.parse(safeGet(TIPS_KEY)) || {}; } catch { return {}; } }
const tipQueue = [];
let tipActive = false;
function coachTip(key, text) {
  const seen = tipsSeen();
  if (seen[key]) return;
  seen[key] = 1;
  safeSet(TIPS_KEY, JSON.stringify(seen));
  tipQueue.push(text);
  pumpTips();
}
function pumpTips() {
  if (tipActive || !tipQueue.length) return;
  tipActive = true;
  const text = tipQueue.shift();
  const b = el('div', 'coach-bubble tappable');
  b.appendChild(artImg('assets/ui/portrait_coach.jpg', '🧢', 'coach-face'));
  b.appendChild(el('span', 'coach-text', `<b>Coach James:</b> ${text}<br><span class="tip-tap">(tap to close)</span>`));
  document.body.appendChild(b);
  b.onclick = () => {
    b.classList.add('gone');
    setTimeout(() => { b.remove(); tipActive = false; pumpTips(); }, 350);
  };
}
function resetTips() { tipQueue.length = 0; tipActive = false; }

// ---------- wake lock + fullscreen ----------
let wakeLock = null, wakeWanted = false;
function holdScreen() {
  wakeWanted = true;
  if (!('wakeLock' in navigator) || wakeLock) return;
  navigator.wakeLock.request('screen').then((wl) => { wakeLock = wl; wl.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
}
function releaseScreen() { wakeWanted = false; if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeWanted) holdScreen(); });
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function fsAvailable() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); }
async function toggleFullscreen() {
  const d = document.documentElement;
  try {
    if (fsEl()) await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    else await (d.requestFullscreen ? d.requestFullscreen() : d.webkitRequestFullscreen());
  } catch { /* some webviews refuse; the button just no-ops */ }
}
const fsLabel = () => `⛶ Full screen: ${fsEl() ? 'ON' : 'OFF'}`;
for (const evName of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(evName, () => document.querySelectorAll('.fs-toggle').forEach((b) => { b.textContent = fsLabel(); }));
}

// ---------- prefetch bundles ----------
function worldArtUrls(w) {
  const keys = new Set();
  const enc = WORLDS[w].encounters;
  for (const pool of Object.values(enc)) for (const g of pool) for (const k of g) keys.add(k);
  for (const wave of WORLDS[w].arena.waves) for (const k of wave.enemies) keys.add(k);
  if (w === 1) keys.add('barbie_guard');
  if (w === 2) { keys.add('lucy_mega'); keys.add('teenie_needoh'); keys.add('water_bead'); }
  if (w === 3) keys.add('delilah_tantrum');
  const urls = [...keys].map((k) => `assets/enemies/${k}.jpg`);
  for (const kind of ['battle', 'map', 'shop', 'rest', 'treasure', 'arena', 'story']) urls.push(`assets/bg/w${w}_${kind}.jpg`);
  return urls;
}
function deckArtUrls(look) {
  if (!run) return [];
  const ids = new Set(run.deck.map((c) => c.id));
  return [...ids].map((id) => SK.cardArt(id, look)[0]).concat(SK.heroArt(run.hero, look)[0]);
}
function prefetchWorld(w) {
  prefetch([...worldArtUrls(w), `assets/audio/world${w}.mp3`, 'assets/audio/boss.mp3', `assets/audio/boss_${WORLDS[w].cousin}.mp3`, ...deckArtUrls(`w${w}`)]);
  if (w < WORLD_COUNT) prefetch(deckArtUrls(`w${w + 1}`)); // the next world's look loads during this one
}

// ================================================================= TITLE
function showTitle() {
  releaseScreen();
  run = null;
  music.play('title');
  const s = screen('title-screen');
  s.classList.remove('look-base');
  s.classList.add('look-base');
  s.appendChild(bgLayer('assets/ui/title.jpg', 'title-art'));
  const inner = el('div', 'title-inner');
  inner.appendChild(el('h1', 'title-logo', '👑 ROLFE LEGENDS 4 🫖'));
  inner.appendChild(el('p', 'subtitle title-sub', '<b>ATTACK OF THE COUSINS</b><br>designed by Wyatt &amp; Aaron · made with Uncle James'));
  const btns = el('div', 'title-buttons');
  const saved = R.deserializeRun(safeGet(SAVE_KEY));
  if (saved) {
    const b = el('button', 'btn gold', `▶️ Continue — ${HEROES[saved.hero].short}, World ${saved.world}: ${WORLDS[saved.world].short}`);
    b.onclick = () => { sfx.tap(); run = saved; resumeRun(); };
    btns.appendChild(b);
  }
  const nb = el('button', 'btn', saved ? '🆕 New game' : '▶️ Play!');
  nb.onclick = () => {
    sfx.tap();
    if (saved) {
      modal('Start a new game?', (m, close) => {
        m.appendChild(el('p', '', 'Your game in progress will be gone.'));
        const yes = el('button', 'btn', 'Yes, new game');
        yes.onclick = () => { close(); clearSave(); showHeroSelect(); };
        const no = el('button', 'btn secondary', 'No, keep it');
        no.onclick = close;
        m.append(yes, no);
      });
    } else showHeroSelect();
  };
  btns.appendChild(nb);
  const p = loadProfile();
  const star = (n) => (n <= 5 ? '⭐'.repeat(n) : `⭐×${n}`);
  const winBits = ['wyatt', 'aaron', 'liam'].filter((h) => p.wins[h] > 0).map((h) => `${HEROES[h].emoji} ${HEROES[h].short} ${star(p.wins[h])}`);
  if (winBits.length) btns.appendChild(el('p', 'subtitle wins-shelf', winBits.join('<br>') + (p.sassMax ? `<br>💅 Sass Level ${p.sassMax} unlocked` : '')));
  if (Object.keys(p.movies || {}).length) {
    const mv = el('button', 'btn secondary', '🎬 Movies');
    mv.onclick = showMovies;
    btns.appendChild(mv);
  }
  const settings = el('button', 'btn secondary', '⚙️ Settings');
  settings.onclick = showSettings;
  btns.appendChild(settings);
  inner.appendChild(btns);
  s.appendChild(inner);
  if (fsAvailable()) {
    const fs = el('button', 'fs-btn', '⛶');
    fs.setAttribute('aria-label', 'Full screen');
    fs.onclick = () => { sfx.tap(); toggleFullscreen(); };
    s.appendChild(fs);
  }
  prefetch(['assets/heroes/wyatt_base.jpg', 'assets/heroes/aaron_base.jpg', 'assets/heroes/liam_base.jpg', 'assets/scenes/farm_start.jpg', 'assets/scenes/plunge_w1.jpg', 'assets/ui/portrait_coach.jpg']);
  prefetch(worldArtUrls(1));
}

function resumeRun() {
  // an unfinished after-fight step picks up where it left off (pet → prize → card reward;
  // boss splash → treasure → next world)
  if (run.after) return continueAfter();
  // an interrupted fight restarts from its beginning (StS behavior) — never skipped,
  // and never a soft-lock on the boss node
  if (run.pending) {
    const { kind, encounter } = run.pending;
    if (kind === 'boss') return bossIntro(encounter);
    return startFight(encounter, kind);
  }
  if (!run.visitorDone) return showVisitor();
  showMap();
}

// ================================================================= SETTINGS
function showSettings() {
  modal('⚙️ Settings', (m, close) => {
    const mus = el('button', 'btn', `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`);
    mus.onclick = () => { music.setEnabled(!music.isEnabled()); mus.textContent = `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`; };
    const sx = el('button', 'btn', `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`);
    sx.onclick = () => { setSfx(!sfxOn()); sx.textContent = `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`; };
    const animLabel = () => `🎬 Animations: ${animMode === 'slow' ? 'SLOW & CLEAR' : 'FAST'}`;
    const anim = el('button', 'btn', animLabel());
    anim.onclick = () => {
      animMode = animMode === 'slow' ? 'fast' : 'slow';
      safeSet(ANIM_KEY, animMode);
      applyFxScale();
      anim.textContent = animLabel();
    };
    m.append(mus, sx, anim);
    if (fsAvailable()) { const fs = el('button', 'btn fs-toggle', fsLabel()); fs.onclick = () => toggleFullscreen(); m.append(fs); }
    const a2hs = el('button', 'btn secondary', '📲 Put it on your home screen');
    a2hs.onclick = () => { close(); showA2HS(); };
    const code = el('button', 'btn secondary', '📦 Save Code (move your game to another tablet)');
    code.onclick = () => { close(); showSaveCode(); };
    m.append(a2hs, code);
    if (run) {
      const quit = el('button', 'btn danger', '🏳️ Give up this run');
      quit.onclick = () => {
        close();
        modal('Give up this run?', (m2, c2) => {
          const yes = el('button', 'btn danger', 'Yes, end it');
          yes.onclick = () => { c2(); clearSave(); showTitle(); };
          const no = el('button', 'btn secondary', 'No, keep playing!');
          no.onclick = c2;
          m2.append(yes, no);
        });
      };
      m.append(quit);
    }
    const nuke = el('button', 'btn danger', '💥 Start over COMPLETELY');
    nuke.onclick = () => {
      close();
      modal('💥 Start over completely?', (m2, c2) => {
        m2.appendChild(el('p', '', 'This erases EVERYTHING on this device: wins, Sass Levels, movies, tips, and any run in progress. There is no undo.'));
        const yes = el('button', 'btn danger', 'Yes — wipe it all');
        yes.onclick = () => { for (const k of [SAVE_KEY, PROFILE_KEY, TIPS_KEY, SEENFX_KEY]) safeDel(k); run = null; c2(); toast('💥 Fresh start!'); showTitle(); };
        const no = el('button', 'btn secondary', 'No — keep my stuff!');
        no.onclick = c2;
        m2.append(yes, no);
      });
    };
    m.append(nuke);
    m.appendChild(el('p', 'subtitle', `Rolfe Legends 4 · designed by Wyatt &amp; Aaron, made with Uncle James<br><span style="opacity:.55;font-size:.72rem">version: ${new Date(document.lastModified).toLocaleString()}</span>`));
  });
}
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
function showA2HS() {
  modal('📲 Home screen', (m) => {
    if (deferredInstall) { const b = el('button', 'btn gold', '⬇️ Install the game'); b.onclick = () => { deferredInstall.prompt(); deferredInstall = null; }; m.appendChild(b); }
    m.appendChild(el('p', '', '<b>iPad / iPhone (Safari):</b> tap Share ⬆️, then <b>"Add to Home Screen"</b>.'));
    m.appendChild(el('p', '', '<b>Android (Chrome):</b> tap ⋮, then <b>"Add to home screen"</b>.'));
    m.appendChild(el('p', '', '<b>Amazon Fire kids tablet:</b> a grown-up adds this website at <b>parents.amazon.com</b> (Add Web Content). Then tap ⛶ on the title screen.'));
    m.appendChild(el('p', 'subtitle', 'Then it gets its own icon — and works with no internet.'));
  });
}
// Save Code: the whole game (run + wins) as a copy-paste code
function encodeSave() {
  const blob = JSON.stringify({ g: 'rl4', run: safeGet(SAVE_KEY), profile: safeGet(PROFILE_KEY) });
  return btoa(unescape(encodeURIComponent(blob)));
}
function decodeSave(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!o || o.g !== 'rl4') return null;
    if (o.run && !R.deserializeRun(o.run)) return null;
    return o;
  } catch { return null; }
}
function showSaveCode() {
  modal('📦 Save Code', (m, close) => {
    m.appendChild(el('p', '', 'Copy this code on THIS tablet, then paste it on the other one.'));
    const ta = el('textarea', 'save-code');
    ta.value = encodeSave(); ta.readOnly = true;
    ta.onclick = () => ta.select();
    m.appendChild(ta);
    m.appendChild(el('p', 'subtitle', 'Got a code from another tablet? Paste it here:'));
    const inp = el('textarea', 'save-code');
    inp.placeholder = 'paste a Save Code…';
    m.appendChild(inp);
    const load = el('button', 'btn gold', '📥 Load that code');
    load.onclick = () => {
      const o = decodeSave(inp.value);
      if (!o) return toast('Hmm, that code doesn\'t look right.');
      if (o.run) safeSet(SAVE_KEY, o.run); else safeDel(SAVE_KEY);
      if (o.profile) safeSet(PROFILE_KEY, o.profile);
      close(); toast('📥 Loaded!'); showTitle();
    };
    m.appendChild(load);
  });
}

// ================================================================= MOVIES
const MOVIES = [
  { key: 'intro', label: '💗 Plunged into the Dreamhouse', play: (done) => SC.worldJump(sceneDeps(), { deck: HEROES.wyatt.starter.map((id) => makeCard(id)), fromLook: 'base', toLook: 'w1' }, done) },
  { key: 'jump2', label: '🫧 Swallowed by the Squishy', play: (done) => SC.worldJump(sceneDeps(), { deck: HEROES.aaron.starter.map((id) => makeCard(id)), fromLook: 'w1', toLook: 'w2' }, done) },
  { key: 'squeeze', label: '👑 The Squeeze Out', play: (done) => SC.squeezeOut(sceneDeps(), done) },
  { key: 'jump3', label: '🫖 Arriving at the Tea Party', play: (done) => SC.worldJump(sceneDeps(), { deck: HEROES.liam.starter.map((id) => makeCard(id)), fromLook: 'w2', toLook: 'w3' }, done) },
  { key: 'ending', label: '🪟 The Ending', play: (done) => playEnding('wyatt', done) },
  { key: 'song', label: '🎵 The Song: "Attack of the Cousins"', play: (done) => { music.play(null); SC.playEndingVideo(sceneDeps(), done, () => creditsRoll('wyatt', { el, artImg, sfx, REDUCED }, done)); } },
];
function showMovies() {
  const p = loadProfile();
  modal('🎬 Movies', (m, close) => {
    for (const mv of MOVIES) {
      if (!p.movies[mv.key]) continue;
      const b = el('button', 'btn', mv.label);
      b.onclick = () => { close(); mv.play(() => { music.play('title'); showTitle(); }); };
      m.appendChild(b);
    }
  });
}

// ================================================================= HERO SELECT
function showHeroSelect() {
  const s = screen('look-base hero-screen');
  s.appendChild(bgLayer(SK.sceneArt('farm_start'), 'battle-bg'));
  s.appendChild(el('h2', '', 'Who takes on the cousins?'));
  const row = el('div', 'hero-pick');
  const MECH = {
    wyatt: '⚡ <b>Momentum:</b> every card you play makes you faster.',
    aaron: '🔨 <b>The Big Hammer:</b> starts every fight in your hand — make it BIGGER.',
    liam: '🚽 <b>The Potty meter:</b> fill it to 10… then FLUSH!',
  };
  for (const id of ['wyatt', 'aaron', 'liam']) {
    const h = HEROES[id];
    const c = el('div', 'hero-card');
    c.setAttribute('role', 'button');
    c.tabIndex = 0;
    c.setAttribute('aria-label', `Play as ${h.name}`);
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') c.click(); });
    c.appendChild(artImg(SK.heroArt(id, 'base'), h.emoji, 'hero-face'));
    c.appendChild(el('h3', '', h.name));
    c.appendChild(el('p', '', h.tagline));
    c.appendChild(el('p', 'hero-mech', MECH[id]));
    c.appendChild(el('p', '', `❤️ ${h.hp} HP · ${TREASURES[h.relic].emoji} ${TREASURES[h.relic].name}`));
    c.onclick = () => { sfx.play(); pickSass(id); };
    row.appendChild(c);
  }
  s.appendChild(row);
  const back = el('button', 'btn secondary', '← Back');
  back.onclick = showTitle;
  s.appendChild(back);
}
function pickSass(heroId) {
  const p = loadProfile();
  if (!p.sassMax) return startRun(heroId, 0);
  modal('💅 How much SASS?', (m, close) => {
    m.appendChild(el('p', 'subtitle', 'Sass Levels make the whole game harder. Each level adds one more thing.'));
    for (let L = 0; L <= p.sassMax; L++) {
      const b = el('button', `btn ${L ? 'secondary two-line' : ''}`, L === 0 ? '🙂 Normal' : `💅 Sass Level ${L}<small>${C.SASS_LEVELS[L]}</small>`);
      b.onclick = () => { close(); startRun(heroId, L); };
      m.appendChild(b);
    }
  });
}
function startRun(heroId, sassLevel) {
  run = R.newRun(heroId, randomSeed(), { sassLevel });
  saveRun();
  music.play('world1');
  // the farm → a sparkly pink portal → plunged into the Dreamhouse (every card changes)
  const root = el('div', 'cutscene story look-base');
  root.appendChild(bgLayer(SK.sceneArt('farm_start'), 'cutscene-bg'));
  const inner = el('div', 'story-inner');
  inner.appendChild(el('div', 'story-kicker', 'BACK ON THE FARM'));
  inner.appendChild(el('h1', 'story-name', 'Just a normal day on the farm…'));
  inner.appendChild(el('div', 'speaker-line story-line', `${HEROES[heroId].name} is ready for anything… until a SPARKLY PINK PORTAL opens in the barn door! 💗`));
  const b = el('button', 'btn gold', '😮 Jump in!');
  b.onclick = () => {
    root.remove();
    SC.worldJump(sceneDeps(), { deck: run.deck, fromLook: 'base', toLook: 'w1' }, () => { markMovie('intro'); showWorldStory(); });
  };
  inner.appendChild(b);
  root.appendChild(inner);
  $app.innerHTML = '';
  document.body.appendChild(root);
}

function showWorldStory() {
  const W = WORLDS[run.world];
  music.play(`world${run.world}`);
  prefetchWorld(run.world);
  $app.innerHTML = '';
  SC.storyCard(sceneDeps(), {
    world: run.world, kicker: `WORLD ${run.world}`, name: W.name.toUpperCase(), emoji: W.emoji,
    sub: W.story.sub, line: `${W.story.line}<br><br><b>Watch out:</b> ${W.challenge}`, button: run.world === 1 ? '💗 Let\'s go!' : '💪 Onward!',
  }, () => showVisitor());
}

// ================================================================= VISITOR (StS2 Ancient)
function showVisitor() {
  const W = WORLDS[run.world];
  const V = W.visitor;
  if (run.visitorDone) return showMap();
  const s = sceneScreen(SK.visitorArt(V.art), V.emoji, `${V.who} came to help!`);
  s.appendChild(el('div', 'speaker-line', V.line));
  s.appendChild(el('p', 'subtitle', '<b>Pick ONE:</b>'));
  const rng = makeRng(run.seed ^ (run.world * 0x51ED));
  for (const offer of R.visitorOffers(run)) {
    const b = el('button', 'btn', VISITOR_OFFERS[offer].label);
    b.onclick = () => { sfx.relic(); handleVisitor(offer, rng); };
    s.appendChild(b);
  }
  coachTip('visitor', 'A family visitor shows up at the start of every world. Pick the gift that helps you most!');
}
function handleVisitor(offer, rng) {
  const r = R.applyVisitor(run, offer, rng);
  if (r.pick) run.visitorDone = false; // a reload mid-pick shows the visitor again (nothing was given yet)
  saveRun();
  const done = () => { run.visitorDone = true; saveRun(); showMap(); };
  if (r.done) {
    if (r.pet) return showPetPop(r.pet, r.petResult, done);
    if (r.treasure) return showTreasurePop(r.treasure, done);
    if (offer === 'maxhp10') toast('❤️ +10 max HP!');
    if (offer === 'heal_full') toast('💖 All healed up!');
    return done();
  }
  if (r.pick === 'rare') return pickFromCards('🌟 Choose a rare card', r.options, (id) => { run.deck.push(makeCard(id)); done(); });
  if (r.pick === 'remove') return multiPickDeck(`✂️ Remove ${r.n} starter cards`, r.options, r.n, (cards) => { for (const c of cards) R.removeCard(run, c.uid); done(); });
  if (r.pick === 'upgrade') return multiUpgrade(r.n, done);
  if (r.pick === 'boss') return pickTreasure('👑 Choose a boss treasure', r.options, done);
  if (r.pick === 'duplicate') return pickCardModal('👯 Copy which card?', r.options, (c) => { R.duplicateCard(run, c.uid); toast(`👯 Another ${CARDS[c.id].name}!`); done(); });
  return done();
}

// ================================================================= MAP
const WEATHER = {
  w1: { n: 14, make: (i) => (i % 4 === 0 ? el('span', 'wp sparkle', '✦') : el('span', 'wp glitterbit')) },
  w2: { n: 12, make: (i) => el('span', `wp bubble${i % 3 === 0 ? ' big' : ''}`) },
  w3: { n: 12, make: (i) => (i % 5 === 0 ? el('span', 'wp petal', '🌸') : el('span', 'wp steam')) },
};
function weatherLayer(look) {
  const w = el('div', `weather weather-${look}`);
  if (REDUCED) return w;
  const spec = WEATHER[look];
  if (!spec) return w;
  for (let i = 0; i < spec.n; i++) {
    const p = spec.make(i);
    p.style.setProperty('--wl', `${(i * 83 + 29) % 100}%`);
    p.style.setProperty('--wt', `${6 + ((i * 47) % 9)}s`);
    p.style.setProperty('--wdel', `${-((i * 13) % 11)}s`);
    p.style.setProperty('--ws', `${0.6 + ((i * 31) % 10) / 12}`);
    w.appendChild(p);
  }
  return w;
}
function nodeMeta(type) {
  const rooms = WORLDS[run.world].rooms;
  return rooms[type] || { ico: '❔', name: type, desc: '' };
}
const ROW_H = 92, MAP_PAD = 40;
function nodeXY(node, W) { return { x: W * (0.14 + node.c * 0.24), y: MAP_PAD + (MAP_FLOORS - node.f) * ROW_H + 20 }; }

function showMap() {
  releaseScreen();
  music.play(`world${run.world}`);
  saveRun();
  const s = screen('map-screen');
  s.appendChild(weatherLayer(curLook()));
  const W = WORLDS[run.world];
  const bar = el('div', 'map-topbar');
  bar.appendChild(el('h2', 'map-title', `${W.emoji} World ${run.world}: ${W.name}`));
  bar.appendChild(el('div', 'floor-meter', `Floor ${run.floor}/${MAP_FLOORS} · ❤️ ${run.hp}/${run.maxHp} · 💰 ${run.coins}${run.sassLevel ? ` · 💅 SL${run.sassLevel}` : ''}`));
  const shelf = el('div', 'relic-shelf');
  for (const rid of run.relics) {
    const t = TREASURES[rid];
    const pin = el('span', 'relic-pin', t.emoji);
    pin.onclick = () => toast(`${t.emoji} <b>${t.name}</b>: ${t.text}`);
    shelf.appendChild(pin);
  }
  if (run.pets.length) {
    const pb = el('button', 'pilebtn', `🐾 ${run.pets.map((p) => PETS[p.id].emoji).join('')}`);
    pb.onclick = showPetsModal;
    shelf.appendChild(pb);
  }
  if (run.freeStickers > 0) {
    const fb = el('button', 'pilebtn glowbtn', `✨ ${run.freeStickers} free sticker${run.freeStickers > 1 ? 's' : ''}!`);
    fb.onclick = () => useFreeStickers(showMap);
    shelf.appendChild(fb);
  }
  const deckBtn = el('button', 'pilebtn', `🎴 ${run.deck.length}`);
  deckBtn.onclick = () => showDeckModal(run.deck);
  const helpBtn = el('button', 'pilebtn', '📖');
  helpBtn.onclick = showHelpModal;
  const menuBtn = el('button', 'pilebtn', '⚙️');
  menuBtn.onclick = showSettings;
  shelf.append(deckBtn, helpBtn, menuBtn);
  bar.appendChild(shelf);
  s.appendChild(bar);

  const wrap = el('div', 'map-wrap');
  const canvas = el('div', 'map-canvas');
  const H = MAP_PAD * 2 + MAP_FLOORS * ROW_H + 40;
  canvas.style.height = `${H}px`;
  canvas.appendChild(bgLayer(SK.worldBg(run.world, 'map'), 'map-bg'));
  const wide = bgLayer(SK.worldBg(run.world, 'map'), 'map-bg-wide');
  wide.style.height = `${H}px`;
  wrap.appendChild(wide);
  s.appendChild(wrap);
  wrap.appendChild(canvas);
  const Wd = Math.min(wrap.clientWidth || 390, 560);
  canvas.style.width = `${Wd}px`;
  const map = run.map;
  const reach = new Set(R.nextNodes(run).map((n) => n.id));
  const onTrail = new Set(run.trail);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', Wd); svg.setAttribute('height', H);
  svg.classList.add('map-edges');
  const trailPairs = new Set();
  for (let i = 0; i < run.trail.length - 1; i++) trailPairs.add(`${run.trail[i]}>${run.trail[i + 1]}`);
  for (const [from, tos] of Object.entries(map.edges)) {
    for (const to of tos) {
      const a = nodeXY(map.nodes[from], Wd), b = nodeXY(map.nodes[to], Wd);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midY = (a.y + b.y) / 2;
      path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`);
      path.classList.add('edge');
      if (trailPairs.has(`${from}>${to}`)) path.classList.add('edge-taken');
      else if (run.pos === from) path.classList.add('edge-open');
      svg.appendChild(path);
    }
  }
  canvas.appendChild(svg);
  let currentEl = null, arenaSeen = false, eliteReach = false;
  for (const [id, node] of Object.entries(map.nodes)) {
    const meta = nodeMeta(node.type);
    const { x, y } = nodeXY(node, Wd);
    const isReach = reach.has(id);
    const cls = ['map-spot', `spot-${node.type}`];
    if (id === BOSS_ID) cls.push('spot-boss-big');
    if (isReach) cls.push('map-node', 'reachable');
    if (onTrail.has(id)) cls.push('visited');
    if (run.pos === id) cls.push('current');
    const d = el('div', cls.join(' '));
    d.style.left = `${x}px`; d.style.top = `${y}px`;
    d.innerHTML = `<span class="spot-ico">${meta.ico}</span>`;
    if (node.type === 'arena') {
      arenaSeen = true;
      const fee = WORLDS[run.world].arena.fee;
      d.appendChild(el('span', `spot-fee${run.coins < fee ? ' broke' : ''}`, `💰${fee}`));
    }
    if (id === BOSS_ID) d.appendChild(artImg(SK.enemyArt(W.cousin), meta.ico, 'spot-boss-face'));
    if (isReach) {
      if (node.type === 'elite') eliteReach = true;
      d.onclick = () => { sfx.tap(); const res = R.enterMapNode(run, id); if (res) enterNode(res); };
    } else d.onclick = () => toast(`${meta.ico} <b>${meta.name}</b> — ${meta.desc}`);
    canvas.appendChild(d);
    if (run.pos === id) currentEl = d;
  }
  if (!run.pos) {
    const start = el('div', 'map-start-hint', '⬆️ Pick your first stop');
    start.style.top = `${MAP_PAD + MAP_FLOORS * ROW_H + 8}px`;
    canvas.appendChild(start);
  }
  requestAnimationFrame(() => {
    const target = currentEl ? currentEl.offsetTop - wrap.clientHeight * 0.62 : canvas.scrollHeight;
    wrap.scrollTo({ top: Math.max(0, target), behavior: REDUCED ? 'auto' : 'smooth' });
  });
  coachTip('map', 'Pick your path! You can see the whole climb — the cousin waits at the top.');
  if (eliteReach) coachTip('elite', '💀 is a TOUGH fight… but it always drops a money pet. Your call!');
  if (arenaSeen && run.floor >= 3) coachTip('arena', '🎟️ The Arena costs coins to get in. Win all 3 waves for a SUPER prize!');
  prefetchWorld(run.world);
}

function enterNode(res) {
  saveRun();
  switch (res.type) {
    case 'fight': case 'elite': return startFight(res.encounter, res.type);
    case 'boss':
      run.pending = { kind: 'boss', encounter: res.encounter };
      saveRun();
      if (run.world === 2) return SC.squeezeOut(sceneDeps(), () => { markMovie('squeeze'); bossIntro(res.encounter); });
      return bossIntro(res.encounter);
    case 'arena': return showArena(res.arena);
    case 'shop': return showShop(res.shop);
    case 'rest': return showRest();
    case 'treasure': return showTreasure(res.treasure);
    default: return showMap();
  }
}

// ================================================================= BOSS INTRO
const BOSS_LINES = {
  stella: '"Welcome to MY Dreamhouse. Everyone here does what the Queen says." 👑',
  lucy: '"Took you long enough! Now meet my squishies." 🫧',
  delilah: '"Nuh-uh. My party. My rules." 💅',
};
function bossIntro(encounter) {
  const key = encounter.enemies[0];
  const W = WORLDS[run.world];
  music.play(`boss_${key}`);
  const s = screen('boss-intro');
  s.appendChild(bgLayer(SK.worldBg(run.world, 'battle'), 'battle-bg'));
  const inner = el('div', 'boss-intro-inner');
  inner.appendChild(el('div', 'story-kicker', 'COUSIN BOSS'));
  const face = artImg(SK.enemyArt(key), W.emoji, 'boss-intro-face');
  inner.appendChild(face);
  secretWink(face, key);
  inner.appendChild(el('h1', 'boss-intro-name', W.boss.toUpperCase()));
  inner.appendChild(el('div', 'speaker-line', BOSS_LINES[key] || ''));
  const b = el('button', 'btn gold', '⚔️ Let\'s battle!');
  b.onclick = () => startFight(encounter, 'boss');
  inner.appendChild(b);
  s.appendChild(inner);
  sfx.boom();
}

// The cousins' secret (James's pick, Sun 2026-09-27): tap her portrait 3 times on her
// intro and she winks, whispers a secret line, and slips you 10 coins. Once per cousin per run.
const SECRET_LINES = {
  stella: '"Psst… don\'t tell anyone, but the Queen likes you. Here — for your outfit fund." 😉👑',
  lucy: '"Okay, secret: I squished these coins out of a NeeDoh. Shhh!" 😉🫧',
  delilah: '"Nuh-uh… okay, UH-HUH. One secret. Don\'t make it weird." 😉💅',
};
function secretWink(face, key) {
  if (!SECRET_LINES[key]) return;
  let taps = 0;
  face.classList.add('secret-tap');
  face.addEventListener('click', () => {
    if ((run.secrets || []).includes(key) || ++taps < 3) return;
    run.secrets = [...(run.secrets || []), key];
    run.coins += 10;
    saveRun();
    face.classList.add('wink');
    sfx.coin();
    const line = face.parentElement && face.parentElement.querySelector('.speaker-line');
    if (line) line.innerHTML = SECRET_LINES[key];
    toast('🤫 A cousin secret! +💰10');
  });
}

// ================================================================= ARENA
function showArena(info) {
  const s = sceneScreen(SK.worldBg(run.world, 'arena'), '🎟️', `🎟️ ${info.name}`);
  s.appendChild(el('div', 'speaker-line', `Three waves, back to back, no healing in between. Win them all for a <b>SUPER</b> prize!`));
  const waves = el('div', 'arena-waves');
  WORLDS[run.world].arena.waves.forEach((w, i) => {
    const counts = w.enemies.reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const txt = Object.entries(counts).map(([k, n]) => `${n > 1 ? n + '× ' : ''}${ENEMIES[k] ? ENEMIES[k].name : k}`).join(' + ');
    waves.appendChild(el('div', 'arena-wave', `<b>Wave ${i + 1}:</b> ${txt}${w.rule ? ` <span class="rule-tag">${TEA_RULES[w.rule].emoji} ${TEA_RULES[w.rule].name}</span>` : ''}`));
  });
  s.appendChild(waves);
  s.appendChild(el('p', 'subtitle', '🏆 Prize: a <b>SUPER money pet</b> — OR — a <b>rare card + a free sticker</b>. You pick!'));
  const pay = el('button', 'btn gold', info.affordable ? `💰 Pay ${info.fee} and enter!` : `💰 ${info.fee} to enter — you have ${run.coins}`);
  pay.disabled = !info.affordable;
  pay.onclick = () => {
    const enc = R.enterArena(run);
    if (!enc) return;
    sfx.gold();
    saveRun();
    startFight(enc, 'arena');
  };
  s.appendChild(pay);
  const skip = el('button', 'btn secondary', info.affordable ? 'No thanks — walk past →' : "Can't afford it — walk past →");
  skip.onclick = () => { saveRun(); showMap(); };
  s.appendChild(skip);
}

// ================================================================= COMBAT
function startFight(encounter, kind) {
  combatKind = kind;
  if (run) { run.pending = { kind, encounter }; saveRun(); }
  combat = C.startCombat(run, encounter, makeRng(randomSeed()), { kind });
  lastPulseTurn = -1;
  holdScreen();
  music.play(kind === 'boss' ? `boss_${encounter.enemies[0]}` : kind === 'elite' || kind === 'arena' ? 'boss' : `world${run.world}`);
  selectedCard = null;
  prevSnap = null;
  renderCombat();
  const n = (run.stats.fights || 0) + (run.stats.elites || 0);
  // one new idea per fight (DESIGN.md §7)
  if (n === 0) coachTip('basics', 'Tap a card to play it. Each card costs ⚡ — you get 3 every turn. The bubble over an enemy shows EXACTLY what it will do next!');
  if (n >= 1) {
    const MECH_TIP = {
      wyatt: '⚡ Watch your MOMENTUM meter: every card you play this turn adds 1. Cards that say "Momentum 3+" get way better!',
      aaron: '🔨 Your Big Hammer starts every fight in your hand. Play Sharpen and friends FIRST to make it bigger, then SMASH!',
      liam: '🚽 Watch the POTTY meter: cards fill it up. At 10… FLUSH! It hits EVERY enemy.',
    };
    coachTip(`mech_${run.hero}`, MECH_TIP[run.hero]);
  }
  if (combat.enemies.some((e) => e.squishy)) coachTip('squishy', '🫧 SQUISHY! That enemy soaks up the first bit of damage every turn. Save up for one BIG turn!');
  if (combat.rule) coachTip('rules', `🫖 TEA PARTY RULES! This fight's rule is up top. A card that would break it glows orange first. Break it and you get a Sass card.`);
  if (combat.enemies.some((e) => e.key === 'stella')) coachTip('outfits', '👗 Stella changes outfits every turn — and you can always see which outfit is NEXT.');
  if (combat.enemies.some((e) => e.key === 'delilah')) coachTip('delilah', '💅 Delilah picks a new rule every few turns — but she always tells you a turn early.');
}

const STATUS_INFO = {
  block: '🛡️ Block: soaks up that much damage, then goes away next turn.',
  pumped: '💪 Pumped: every attack hits that much harder.',
  wobbly: '🫨 Wobbly: attacks do 25% LESS damage. Goes down by 1 each turn.',
  wideOpen: '🎯 Wide Open: takes 50% MORE damage from attacks. Goes down by 1 each turn.',
  squishy: '🫧 Squishy: soaks up this much of your damage EVERY turn. Big turns beat it!',
  shield: '🙅 Nuh-Uh Shield: stops damage until it breaks. Break it and she\'s Wide Open!',
  dissolved: '✨ Dissolved: can\'t be hit this turn. It comes back next turn!',
  guests: '🎀 Guests first! You have to beat the party guests before you can hit the Teddy.',
  held: '👗 It\'s trying on one of your cards! You get it back in 2 turns (or when you beat it).',
};
function seenFx() { try { return JSON.parse(safeGet(SEENFX_KEY)) || {}; } catch { return {}; } }
function markFxSeen(k) { const s = seenFx(); s[k] = 1; safeSet(SEENFX_KEY, JSON.stringify(s)); }
function statusChips(cr, isEnemy = false) {
  const seen = seenFx();
  const chips = [];
  const add = (k, label) => chips.push(`<span class="chip${seen[k] ? '' : ' chip-new'}" data-status="${k}">${label}</span>`);
  if (cr.block) add('block', `🛡️${cr.block}`);
  if (cr.pumped) add('pumped', `💪${cr.pumped}`);
  if (cr.wobbly) add('wobbly', `🫨${cr.wobbly}`);
  if (cr.wideOpen) add('wideOpen', `🎯${cr.wideOpen}`);
  if (isEnemy) {
    if (cr.squishy) add('squishy', `🫧${cr.squishLeft}/${cr.squishy}`);
    if (cr.shield > 0) add('shield', `🙅${cr.shield}`);
    if (cr.dissolved) add('dissolved', '✨');
    if (cr.state && cr.state.held) add('held', `👗${CARDS[cr.state.held.id].emoji}`);
    if (combat && cr.key === 'teddy_in_a_tiara' && !C.targetable(combat, cr) && cr.hp > 0) add('guests', '🎀');
  }
  return chips.join('');
}
const POWER_INFO = {
  keep_moving: { emoji: '🔁', text: (n) => `Keep Moving: your 4th card each turn gives ${n} Block.` },
  lightning_legs: { emoji: '⚡', text: (n) => `Lightning Legs: Momentum starts every turn at ${n}.` },
  forged: { emoji: '🏭', text: (n) => `Forged on the Farm: every Big Hammer swing makes it +${n} bigger.` },
  titan_grip: { emoji: '🤜', text: () => 'Titan Grip: the Big Hammer costs 1.' },
  big_kid_stickers: { emoji: '⭐', text: (n) => `Big Kid Stickers: draw ${n} after every FLUSH!` },
  big_boy_undies: { emoji: '🦸', text: (n) => `Big Boy Undies: +${n} Pumped after every FLUSH!` },
  royal_throne: { emoji: '👑', text: (n) => `Royal Throne: FLUSH! does +${n} damage.` },
};
function powerChips(h) {
  return Object.entries(h.powers || {}).filter(([k, v]) => v != null && v !== false && POWER_INFO[k])
    .map(([k, v]) => `<span class="chip chip-power" data-power="${k}">${POWER_INFO[k].emoji}${Number.isFinite(v) && v !== true ? v : ''}</span>`).join('');
}
const INTENT_KIND_INFO = {
  attack: (n, d) => `⚔️ ${n}: it will attack you for ${d} after your turn!`,
  defend: (n) => `🛡️ ${n}: it will protect itself.`,
  buff: (n) => `⬆️ ${n}: it will power itself (or its friends) up.`,
  debuff: (n) => `🌀 ${n}: it will do something sneaky to you.`,
  sleep: (n) => `😴 ${n}.`,
  summon: (n) => `➕ ${n}: it will call in friends.`,
  countdown: (n) => `⏳ ${n}: something BIG is coming.`,
  special: (n) => `✨ ${n}.`,
};
function intentLabel(st, e) {
  const it = e.intent;
  if (!it) return '';
  if (it.dmg != null) {
    const p = C.intentPreview(st, e);
    const t = p.times > 1 ? `×${p.times}` : '';
    const extra = it.block ? ` 🛡️${it.block}` : '';
    return `<span class="intent attack" data-intent="attack" data-name="${escapeAttr(it.name)}" data-dmg="${p.per}${t} (${p.per * p.times} total)">⚔️ ${p.per}${t}${extra}</span>`;
  }
  const icons = { defend: '🛡️', buff: '⬆️', debuff: '🌀', sleep: '😴', summon: '➕', countdown: '⏳', special: '✨' };
  const num = it.block ? ` ${it.block}` : '';
  return `<span class="intent ${it.kind}" data-intent="${it.kind}" data-name="${escapeAttr(it.name)}">${icons[it.kind] || '❔'}${num} <small>${it.name}</small></span>`;
}
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

function snapCombat(st) {
  const snap = { heroHp: st.hero.hp, heroBlock: st.hero.block, enemies: {}, count: st.enemies.length };
  st.enemies.forEach((e, i) => { snap.enemies[i] = { hp: e.hp, block: e.block, dead: e.hp <= 0, artKey: e.artKey, name: e.name, pumped: e.pumped || 0 }; });
  return snap;
}
function floaty(target, text, cls, leftPct) {
  if (!target || REDUCED) return;
  const f = el('span', `floaty ${cls}`, text);
  f.style.left = `${leftPct ?? 22 + Math.random() * 46}%`;
  const ms = Math.round(950 * fxScale());
  f.style.animationDuration = `${ms}ms`;
  target.appendChild(f);
  setTimeout(() => f.remove(), ms + 60);
}
function bigBanner(text, cls = '') {
  if (REDUCED) return toast(text);
  const b = el('div', `big-banner ${cls}`, text);
  document.body.appendChild(b);
  setTimeout(() => b.remove(), Math.round(1600 * fxScale()));
}
function formShiftFx(enemyEl, oldArtKey, emoji) {
  if (!enemyEl) return;
  const face = enemyEl.querySelector('.face');
  enemyEl.classList.add('form-shifting');
  const ms = Math.round(900 * fxScale());
  if (face && !REDUCED && oldArtKey) {
    const ghost = artImg(SK.enemyArt(oldArtKey), emoji, 'face form-ghost');
    ghost.style.animationDuration = `${ms}ms`;
    face.appendChild(ghost);
    setTimeout(() => ghost.remove(), ms + 60);
  }
  floaty(enemyEl, '✨ CHANGING!', 'formshift');
  sfx.boom();
  setTimeout(() => enemyEl.classList.remove('form-shifting'), ms + 60);
}
function splitInFx(enemyEl) {
  if (!enemyEl || REDUCED) return;
  enemyEl.classList.add('splitting-in');
  setTimeout(() => enemyEl.classList.remove('splitting-in'), Math.round(760 * fxScale()) + 60);
}

let lastLogIdx = 0;
function animateDiffs(s, enemyEls, heroEl) {
  const st = combat;
  if (!prevSnap || !st) { prevSnap = st ? snapCombat(st) : null; lastLogIdx = st ? st.log.length : 0; return; }
  const prev = prevSnap;
  const events = st.log.slice(lastLogIdx);
  lastLogIdx = st.log.length;
  let delay = 0;
  const stagger = Math.max(90, Math.round(190 * fxScale()));
  const meterEl = s.querySelector('.hero-meter');
  for (const ev of events) {
    const tgt = ev.target === 'hero' ? heroEl : enemyEls[ev.target];
    switch (ev.t) {
      case 'relic': { const pin = document.querySelector(`.belt-pin[data-relic="${ev.id}"]`); if (pin) { pin.classList.remove('proc'); void pin.offsetWidth; pin.classList.add('proc'); } continue; }
      case 'flush': bigBanner(`🚽 FLUSH!${ev.of > 1 ? ` (${ev.n}/${ev.of})` : ''}`, 'banner-flush'); sfx.flush(); if (meterEl) { meterEl.classList.remove('flushing'); void meterEl.offsetWidth; meterEl.classList.add('flushing'); } continue;
      case 'forge': floaty(meterEl || heroEl, `🔨 +${ev.n} → ${ev.total}`, 'formshift'); sfx.clang(); continue;
      case 'potty': if (ev.n > 0) floaty(meterEl || heroEl, `💧+${ev.n}`, 'blk'); continue;
      case 'squished': if (tgt) floaty(tgt, `🫧 squished ${ev.amount}`, 'blk'); sfx.squish(); continue;
      case 'shield': if (tgt) floaty(tgt, `🙅 -${ev.amount}`, 'blk'); continue;
      case 'shieldBreak': if (tgt) { floaty(tgt, '💥 SHIELD BROKEN! Wide Open!', 'formshift'); tgt.classList.add('fury-flash'); } sfx.boom(); continue;
      case 'sass': toast(ev.why === 'rule' ? '🙄 You broke the rule! A <b>Sass</b> card went into your draw pile. (Say Sorry to toss it.)' : '🙄 Sass! A <b>Sass</b> card went into your draw pile.'); sfx.sass(); coachTip('sass', '🙄 Sass cards can\'t be played. Tap one in your hand to Say Sorry (1 ⚡) and toss it. They all vanish after the fight.'); continue;
      case 'sassCapped': continue;
      case 'sorry': toast('😇 "Sorry!" — Sass tossed.'); sfx.heal(); continue;
      case 'steal': toast(`👗 The Closet Monster is TRYING ON your <b>${CARDS[ev.id].name}</b>! You'll get it back.`); sfx.debuff(); continue;
      case 'returned': toast(`↩️ You got your <b>${CARDS[ev.id].name}</b> back!`); continue;
      case 'slimed': if (ev.id) toast(`🟢 Slimed! Your <b>${CARDS[ev.id].name}</b> costs 1 more this fight.`); sfx.squish(); continue;
      case 'wave': bigBanner(`🎟️ WAVE ${ev.n}!`); sfx.boom(); continue;
      case 'rule': bigBanner(`🫖 New rule: ${TEA_RULES[ev.rule].name}`, 'banner-rule'); sfx.sass(); continue;
      case 'bossPhase': bigBanner(ev.text, 'banner-boss'); sfx.boom(); { const a = document.getElementById('app'); a.classList.add('quake'); setTimeout(() => a.classList.remove('quake'), 900); } continue;
      case 'grow': if (tgt) floaty(tgt, '👑 BIGGER!', 'formshift'); continue;
      case 'heal': if (tgt) floaty(tgt, `💚+${ev.amount}`, 'heal'); continue;
      case 'immune': if (tgt) floaty(tgt, ev.target !== 'hero' && st.enemies[ev.target] && st.enemies[ev.target].dissolved ? '✨ dissolved!' : '🎀 guests first!', 'blk'); continue;
      case 'play': continue;
      default: break;
    }
    if (!tgt) continue;
    const hitIdx = delay / stagger;
    const show = () => {
      if (ev.t === 'dmg') {
        const icon = ev.src === 'flush' ? '🚽 ' : '';
        floaty(tgt, `${icon}-${ev.amount}`, 'dmg' + (ev.amount >= 12 ? ' big' : ''));
        tgt.classList.remove('shake'); void tgt.offsetWidth; tgt.classList.add('shake');
        if (ev.target === 'hero') sfx.hurt();
        else if (ev.amount >= 15) sfx.boom();
        else if (ev.amount >= 8) sfx.slash();
        else sfx.slashTick(hitIdx);
      } else if (ev.t === 'blocked') { floaty(tgt, '🛡️ Blocked!', 'blk'); sfx.shieldClink(); }
    };
    if (REDUCED || delay === 0) show(); else setTimeout(show, delay);
    delay += stagger;
  }
  st.enemies.forEach((e, i) => {
    const elx = enemyEls[i];
    if (!elx) return;
    const p = prev.enemies[i];
    if (!p) { if (i >= prev.count) splitInFx(elx); return; }
    if (e.hp <= 0 && !p.dead) {
      elx.classList.add('dying');
      if (e.isBoss) {
        elx.classList.add('dying-boss');
        floaty(elx, '💥 OUTPLAYED!', 'formshift');
        sfx.bossDefeat();
        const a = document.getElementById('app'); a.classList.add('quake'); setTimeout(() => a.classList.remove('quake'), 900);
      } else sfx.defeat();
    }
    if (e.block > p.block) floaty(elx, `🛡️+${e.block - p.block}`, 'blk');
    if ((e.pumped || 0) > p.pumped) floaty(elx, `💪+${(e.pumped || 0) - p.pumped}`, 'formshift');
    if (e.artKey !== p.artKey) formShiftFx(elx, p.artKey, e.emoji);
  });
  if (st.hero.hp > prev.heroHp) floaty(heroEl, `+${st.hero.hp - prev.heroHp}`, 'heal');
  if (st.hero.block > prev.heroBlock) floaty(heroEl, `🛡️+${st.hero.block - prev.heroBlock}`, 'blk');
  prevSnap = snapCombat(st);
}

function heroMeter(st) {
  const hero = run.hero;
  const m = el('div', `hero-meter meter-${hero}`);
  if (hero === 'wyatt') {
    const mom = st.momentum;
    m.innerHTML = `<span class="meter-label">⚡ MOMENTUM</span><span class="speedo">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="pip${mom >= i ? ' on' : ''}${i === 3 ? ' mark' : ''}"></i>`).join('')}</span><b class="meter-num">${mom}</b>`;
    m.dataset.meter = 'momentum';
  } else if (hero === 'aaron') {
    const d = C.attackValue(C.hammerDamage(st), st.hero);
    m.innerHTML = `<span class="meter-label">🔨 BIG HAMMER</span><b class="meter-num hammer-num">${d}</b>${st.hammer.all ? '<span class="meter-tag">hits ALL</span>' : ''}${st.hammer.bounceNext ? '<span class="meter-tag">🏀 bounces</span>' : ''}`;
    m.dataset.meter = 'hammer';
  } else {
    const p = st.potty;
    m.innerHTML = `<span class="meter-label">🚽 POTTY</span><span class="potty-bar"><span class="potty-fill" style="width:${(p / POTTY_MAX) * 100}%"></span></span><b class="meter-num">${p}/${POTTY_MAX}</b>${st.doubleFlush ? '<span class="meter-tag">×2</span>' : ''}`;
    m.dataset.meter = 'potty';
    if (p >= 7) m.classList.add('almost');
  }
  return m;
}

let lastPulseTurn = -1;
function renderCombat(actedEnemy = null) {
  const s = screen('combat');
  s.classList.remove('screen-enter');
  const st = combat;
  if (st.hero.hp > 0 && st.hero.hp <= st.hero.maxHp * 0.25) {
    s.classList.add('danger');
    if (st.turn !== lastPulseTurn) { lastPulseTurn = st.turn; sfx.heartbeat(); }
  }
  s.appendChild(bgLayer(SK.worldBg(run.world, 'battle'), 'battle-bg'));
  const inner = el('div', 'combat-inner');
  s.appendChild(inner);
  // Tea Party Rules banner (never changes mid-turn) + Delilah's announcement
  // Delilah announces her rule change a turn early: the banner shows it while her move is pending
  const announced = st.nextRule || (C.livingEnemies(st).find((e) => e.intent && e.intent.nextRule) || {}).intent?.nextRule || null;
  if ((st.rule || announced) && !st.rulesOff) {
    const rb = el('div', 'rule-banner');
    if (st.rule) rb.innerHTML = `<b>${TEA_RULES[st.rule].emoji} ${TEA_RULES[st.rule].name}</b> ${TEA_RULES[st.rule].text}`;
    if (announced && announced !== st.rule) rb.innerHTML += `<div class="rule-next">📣 NEXT TURN: <b>${TEA_RULES[announced].name}</b> ${TEA_RULES[announced].text}</div>`;
    rb.onclick = () => toast(`🫖 Break a rule and you get a <b>Sass</b> card. A card that would break it glows orange first.`);
    inner.appendChild(rb);
  }
  if (combatKind === 'arena') inner.appendChild(el('div', 'wave-chip', `🎟️ Wave ${st.waveNo}/3`));
  // enemies
  const row = el('div', 'enemy-row');
  const enemyEls = [];
  st.enemies.forEach((e, i) => {
    if (e.gone) { enemyEls[i] = null; return; }
    const dead = e.hp <= 0;
    const d = el('div', `enemy${dead ? ' dead' : ''}${e.isBoss ? ' boss-foe' : ''}${e.isElite && !e.isBoss ? ' elite-foe' : ''}${e.dissolved ? ' dissolved' : ''}`);
    if (!st._spawnFxDone && !REDUCED) { d.classList.add(`spawn-${curLook()}`); d.style.setProperty('--si', String(i)); }
    if (!dead) {
      const spent = st.phase === 'enemy' && !st.queue.includes(e);
      d.insertAdjacentHTML('beforeend', spent
        ? '<div class="intent-slot"><span class="next-label">NEXT MOVE</span><span class="intent thinking">…</span></div>'
        : `<div class="intent-slot"><span class="next-label">NEXT MOVE</span>${intentLabel(st, e)}</div>`);
      if (e.key === 'stella' && e.nextOutfit) {
        const O = { ballgown: '👗 Ballgown', sporty: '👟 Sporty', tiara: '💎 Tiara' };
        d.insertAdjacentHTML('beforeend', `<div class="outfit-next">then: ${O[e.nextOutfit]}</div>`);
      }
    }
    d.appendChild(artImg(SK.enemyArt(e.artKey), e.emoji, 'face'));
    d.insertAdjacentHTML('beforeend', `<div class="nm">${e.name}</div>
      <div class="hpbar"><div style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></div></div>
      <div class="hpnum">❤️ ${Math.max(0, e.hp)}/${e.maxHp}</div>
      <div class="chips">${statusChips(e, true)}</div>`);
    const canTarget = !dead && C.targetable(st, e);
    if (canTarget && selectedCard && cardWantsTarget(selectedCard)) { d.classList.add('targetable'); d.onclick = () => playSelected(e, d); }
    else if (!dead) { d.classList.add('scoutable'); d.onclick = () => showScout(e); }
    if (e === actedEnemy) d.classList.add('lunge');
    row.appendChild(d);
    enemyEls[i] = d;
  });
  st._spawnFxDone = true;
  inner.appendChild(row);
  // hero strip + meter
  const h = st.hero;
  const hero = HEROES[run.hero];
  const strip = el('div', 'hero-strip');
  strip.appendChild(artImg(SK.heroArt(run.hero, curLook()), hero.emoji, 'face hero-face-combat'));
  const stats = el('div', 'stats');
  stats.innerHTML = `<b>${hero.name}</b>
      <div class="hpbar"><div style="width:${h.hp / h.maxHp * 100}%"></div></div>
      <div class="hpnum">❤️ ${h.hp}/${h.maxHp} ${h.block ? `· 🛡️ ${h.block}` : ''}</div>
      <div class="chips">${statusChips(h)}${powerChips(h)}</div>`;
  strip.appendChild(stats);
  strip.appendChild(el('div', 'energy-orb', `${h.energy}<small>⚡</small>`));
  inner.appendChild(strip);
  inner.appendChild(heroMeter(st));
  // belt: treasures
  if (run.relics.length) {
    const belt = el('div', 'belt-row');
    const g = el('div', 'belt-group');
    g.appendChild(el('div', 'belt-label', 'TREASURES'));
    const pins = el('div', 'belt-pins');
    for (const rid of run.relics) {
      const t = TREASURES[rid];
      const pin = el('button', 'relic-pin belt-pin', t.emoji);
      pin.dataset.relic = rid;
      pin.onclick = () => toast(`${t.emoji} <b>${t.name}</b>: ${t.text}`);
      pins.appendChild(pin);
    }
    g.appendChild(pins);
    belt.appendChild(g);
    inner.appendChild(belt);
  }
  // hand
  const hand = el('div', 'hand');
  const n = st.hand.length;
  st.hand.forEach((c, i) => {
    const info = cardInfo(c);
    const afford = C.canPlay(st, c) && st.phase !== 'enemy';
    const breaks = afford && C.cardBreaksRule(st, c);
    const d = cardFace(c, { live: true, extraCls: `${c === selectedCard ? 'selected' : ''}${afford || c.id === 'sass' ? '' : ' unaffordable'}${breaks ? ' breaks-rule' : ''}` });
    if (breaks) d.appendChild(el('div', 'card-tag tag-rule', 'breaks the rule!'));
    if (c.id === 'sass') d.appendChild(el('div', 'card-tag tag-sorry', C.canSaySorry(st, c) ? 'tap: Say Sorry (1⚡)' : 'need 1⚡ to say sorry'));
    if (!REDUCED && n > 1) {
      const off = i - (n - 1) / 2;
      d.style.setProperty('--fan-rot', `${off * Math.min(4, 26 / n)}deg`);
      d.style.setProperty('--fan-y', `${Math.abs(off) * Math.min(3.4, 22 / n)}px`);
    }
    d.onclick = () => onCardTap(c, d);
    void info;
    hand.appendChild(d);
  });
  inner.appendChild(hand);
  if (selectedCard && cardWantsTarget(selectedCard)) inner.appendChild(el('div', 'target-hint', '🎯 Tap an enemy!'));
  // bottom bar
  const bottom = el('div', 'combat-bottom');
  const drawB = el('button', 'pilebtn', `🎴 ${st.draw.length}`);
  drawB.onclick = () => showDeckModal(st.draw, 'Draw pile (shuffled)');
  const discB = el('button', 'pilebtn', `🗑️ ${st.discard.length}`);
  discB.onclick = () => showDeckModal(st.discard, 'Discard pile');
  bottom.append(drawB, discB);
  if (st.exhaust.length) { const exB = el('button', 'pilebtn', `♻️ ${st.exhaust.length}`); exB.onclick = () => showDeckModal(st.exhaust, 'Used up this fight'); bottom.append(exB); }
  const endB = el('button', 'endturn', st.phase === 'enemy' ? '👀 ENEMY TURN…' : 'END TURN ▶');
  endB.disabled = st.phase === 'enemy';
  endB.onclick = () => { sfx.turn(); selectedCard = null; runEnemyPhase(); };
  const infoB = el('button', 'pilebtn', '📖');
  infoB.onclick = showHelpModal;
  bottom.append(endB, infoB);
  inner.appendChild(bottom);
  animateDiffs(s, enemyEls, strip);
}

function runEnemyPhase() {
  if (!combat) return;
  if (!C.beginEnemyPhase(combat)) return;
  renderCombat();
  const step = () => {
    if (!combat) return;
    if (combat.over) return afterAction();
    const actor = C.stepEnemyAction(combat);
    if (combat.over) { renderCombat(actor); return setTimeout(afterAction, REDUCED ? 0 : stepMs() + 250); }
    if (actor) { renderCombat(actor); setTimeout(step, stepMs()); } else renderCombat();
  };
  setTimeout(step, REDUCED ? 0 : Math.round(stepMs() * 0.5));
}

function cardWantsTarget(c) {
  return C.cardNeedsTarget(cardInfo(c), combat) && C.targetableEnemies(combat).length > 1;
}
function flyCard(cardEl, targetEl) {
  if (REDUCED || !cardEl) return;
  const r = cardEl.getBoundingClientRect();
  const ghost = cardEl.cloneNode(true);
  ghost.classList.add('card-ghost');
  ghost.style.left = `${r.left}px`; ghost.style.top = `${r.top}px`; ghost.style.width = `${r.width}px`;
  let dx = 0, dy = -window.innerHeight * 0.45;
  if (targetEl) { const t = targetEl.getBoundingClientRect(); dx = t.left + t.width / 2 - (r.left + r.width / 2); dy = t.top + t.height / 2 - (r.top + r.height / 2); }
  ghost.style.setProperty('--fly-x', `${dx}px`);
  ghost.style.setProperty('--fly-y', `${dy}px`);
  const ms = Math.round(520 * fxScale());
  ghost.style.transitionDuration = `${ms}ms`;
  document.body.appendChild(ghost);
  requestAnimationFrame(() => ghost.classList.add('fly'));
  setTimeout(() => ghost.remove(), ms + 40);
}
function playCardSound(info) {
  const fx = info.fx || [];
  if (info.type === 'power') return sfx.powerUp();
  if (fx.some((o) => o.potty)) return sfx.pop();
  if (fx.some((o) => o.hammerPlus)) return sfx.clang();
  if (fx.some((o) => o.status && ['wobbly', 'wideOpen'].includes(o.status.k)) && info.type !== 'attack') return sfx.debuff();
  if (fx.some((o) => o.block != null || o.pottySpend)) return sfx.shield();
  if (fx.some((o) => o.draw || o.relay)) return sfx.sparkle();
  if (info.type === 'attack') return;
  return sfx.play();
}
function onCardTap(c, cardEl) {
  if (combat.phase === 'enemy') return;
  if (c.id === 'sass') {
    if (C.saySorry(combat, c)) { afterAction(); }
    else { sfx.tap(); toast('🙄 You need 1 ⚡ to Say Sorry.'); }
    return;
  }
  if (!C.canPlay(combat, c)) {
    sfx.tap();
    const info = cardInfo(c);
    const spend = (info.fx || []).find((o) => o.pottySpend);
    if (spend && combat.potty < spend.pottySpend.n) toast(`🚽 ${info.name} needs ${spend.pottySpend.n} Potty.`);
    const orb = document.querySelector('.energy-orb');
    if (orb) { orb.classList.remove('pulse'); void orb.offsetWidth; orb.classList.add('pulse'); }
    return;
  }
  if (cardWantsTarget(c)) { selectedCard = selectedCard === c ? null : c; renderCombat(); return; }
  selectedCard = null;
  const info = cardInfo(c);
  playCardSound(info);
  const targetEl = info.type === 'attack' ? document.querySelector('.enemy:not(.dead):not(.dissolved)') : document.querySelector('.hero-strip');
  flyCard(cardEl, targetEl);
  C.playCard(combat, c, C.targetableEnemies(combat)[0]);
  afterAction();
}
function playSelected(enemy, enemyEl) {
  const c = selectedCard;
  selectedCard = null;
  playCardSound(cardInfo(c));
  flyCard(document.querySelector('.card.selected'), enemyEl);
  C.playCard(combat, c, enemy);
  afterAction();
}
function showScout(e) {
  sfx.tap();
  modal(null, (m, close) => {
    const head = el('div', 'scout-head');
    head.appendChild(artImg(SK.enemyArt(e.artKey), e.emoji, 'face scout-face'));
    const who = el('div', 'scout-who');
    who.appendChild(el('div', 'scout-name', e.name));
    who.appendChild(el('div', 'scout-hp', `❤️ ${Math.max(0, e.hp)} / ${e.maxHp}`));
    head.appendChild(who);
    m.appendChild(head);
    const facts = [];
    if (e.intent) facts.push(`<b>Next move:</b> ${e.intent.name}${e.intent.dmg != null ? ` (⚔️ ${C.intentPreview(combat, e).per}${(e.intent.times || 1) > 1 ? `×${e.intent.times}` : ''})` : ''}`);
    if (e.block > 0) facts.push(`🛡️ ${e.block} Block right now`);
    if (e.squishy) facts.push(`🫧 Squishy: soaks the first ${e.squishy} damage every turn (${e.squishLeft} left this turn)`);
    if (e.shield > 0) facts.push(`🙅 Nuh-Uh Shield: ${e.shield} left — break it and she's Wide Open!`);
    if (e.pumped) facts.push(`💪 ${e.pumped} Pumped`);
    if (e.wobbly) facts.push(`🫨 Wobbly for ${e.wobbly}`);
    if (e.wideOpen) facts.push(`🎯 Wide Open for ${e.wideOpen}`);
    if (e.dissolved) facts.push('✨ Dissolved — can\'t be hit this turn');
    if (e.state && e.state.held) facts.push(`👗 Wearing your ${CARDS[e.state.held.id].name}`);
    m.appendChild(el('div', 'scout-facts', facts.join('<br>')));
    const ok = el('button', 'btn', '👍 Got it');
    ok.onclick = close;
    m.appendChild(ok);
  });
}

let winPending = false;
function afterAction() {
  if (!combat) return;
  if (combat.over) {
    if (winPending) return;
    winPending = true;
    renderCombat();
    if (combat.won) {
      const ms = REDUCED ? 0 : Math.round((combatKind === 'boss' ? 1900 : 900) * fxScale());
      setTimeout(() => { winPending = false; combatWon(); }, ms);
      return;
    }
    sfx.lose();
    const app = document.getElementById('app');
    if (!REDUCED) app.classList.add('ko');
    setTimeout(() => { winPending = false; app.classList.remove('ko'); fadeOutThen(showDefeat); }, REDUCED ? 0 : Math.round(1600 * fxScale()));
    return;
  }
  renderCombat();
}
function fadeOutThen(fn) {
  const cur = document.querySelector('.screen');
  if (REDUCED || !cur) return fn();
  cur.classList.add('screen-fade-out');
  setTimeout(fn, Math.round(480 * fxScale()));
}

// ================================================================= AFTER A WIN
function combatWon() {
  sfx.win();
  const st = combat;
  combat = null;
  prevSnap = null;
  releaseScreen();
  const kind = combatKind;
  run.pending = null;
  const result = R.applyCombatResult(run, st, kind === 'arena' ? 'elite' : kind);
  const rng = makeRng(run.seed ^ (run.world * 31 + run.floor * 7) ^ 0x5EED);
  const rewards = R.fightRewards(run, kind, rng);
  // the pet joins NOW (or waits on a full-pouch swap), and every later step is saved, so a
  // reload never loses a reward, repeats a prize, or strands the run (review bug #1)
  const petResult = rewards.petDrop ? R.addPet(run, rewards.petDrop) : null;
  run.after = { kind, rewards, petId: rewards.petDrop || null, petResult, petDone: !rewards.petDrop, prize: kind === 'arena' ? 'pending' : null };
  saveRun();
  if (kind === 'boss') return fadeOutThen(() => showBossSplash(st, rewards));
  fadeOutThen(() => showVictoryBeat(st, kind, rewards, result, continueAfter));
}

// The after-fight steps in order: new pet → Arena prize → card reward. Resumable.
function continueAfter() {
  const a = run.after;
  if (!a) return showMap();
  if (a.kind === 'boss') return showBossSplash(null, a.rewards);
  if (a.petId && !a.petDone) {
    return showPetPop(a.petId, a.petResult, () => { a.petDone = true; saveRun(); continueAfter(); });
  }
  if (a.kind === 'arena' && a.prize !== 'claimed') return showArenaPrize(continueAfter);
  return showReward(a.rewards, a.kind);
}
function finishAfter() { run.after = null; saveRun(); showMap(); }

const BEAT_LINES = [(n) => `Nice work! ${n}? Handled.`, (n) => `THAT'S how it's done. ${n} is done for.`, (n) => `Look at you go! ${n} didn't stand a chance.`];
let beatIdx = 0;
function showVictoryBeat(st, kind, rewards, result, onDone) {
  const named = st.enemies.filter((e) => !e.gone).map((e) => e.name);
  const label = named.length > 1 ? `${named[0]} & friends` : (named[0] || 'That troublemaker');
  const s = screen('victory-beat');
  s.appendChild(artImg('assets/ui/portrait_coach.jpg', '🧢', 'scene-art'));
  s.appendChild(el('h2', '', kind === 'arena' ? '🎟️ ARENA CHAMPION!' : kind === 'elite' ? '💀 Tough fight — WON!' : 'Nice work!'));
  s.appendChild(el('div', 'speaker-line', `"${BEAT_LINES[beatIdx++ % BEAT_LINES.length](label)}"`));
  // the coin tally: money is legible (Polish floor 13)
  const tally = el('div', 'coin-tally');
  const lines = [];
  if (rewards.coins) lines.push(`<span>⚔️ Fight win</span><b>+💰${rewards.coins}</b>`);
  for (const p of rewards.pets) lines.push(`<span>${PETS[p.id].emoji} ${PETS[p.id].name}</span><b>+💰${p.earned}</b>`);
  if (result.stickerCoins) lines.push(`<span>📋 Sticker Chart gold star</span><b>+💰${result.stickerCoins}</b>`);
  if (result.teacup) lines.push(`<span>🍵 Teacup of Courage</span><b>+❤️${result.teacup}</b>`);
  if (!lines.length) lines.push('<span>No coins this time</span><b></b>');
  tally.innerHTML = lines.map((l) => `<div class="tally-line">${l}</div>`).join('') + `<div class="tally-total">💰 You have ${run.coins} coins</div>`;
  s.appendChild(tally);
  if (rewards.pets.length) sfx.coin();
  s.appendChild(el('div', 'tip-card', `💡 <b>Coach's tip:</b> ${nextTip(run.hero)}`));
  const b = el('button', 'btn gold', '🎉 Keep going →');
  b.onclick = onDone;
  s.appendChild(b);
}

function showReward(rewards, kind) {
  const s = screen('center-stack');
  s.appendChild(el('h2', '', '🎴 Pick a new card'));
  s.appendChild(el('p', 'subtitle', 'It joins your deck for the WHOLE run — every world!'));
  const row = el('div', 'reward-row');
  for (const id of rewards.cards) {
    const d = cardFace(makeCard(id), { mini: true });
    d.onclick = () => { if (!run.after) return; sfx.play(); run.deck.push(makeCard(id)); finishAfter(); };
    row.appendChild(d);
  }
  s.appendChild(row);
  const skip = el('button', 'btn secondary', 'Skip →');
  skip.onclick = () => finishAfter();
  s.appendChild(skip);
  coachTip('reward', 'Pick a card to add to your deck — or skip if none of them help. A small deck draws its best cards more often!');
  void kind;
}

// ---------- pets ----------
function showPetPop(petId, addResult, onDone) {
  const pd = PETS[petId];
  sfx.relic();
  const tier = PET_TIERS[pd.tier];
  modal(null, (m, close) => {
    m.classList.add('treasure-pop');
    m.appendChild(el('h2', '', `🐾 A ${tier.label} MONEY PET!`));
    m.appendChild(artImg(SK.petArt(petId, curLook(), pd.world), pd.emoji, 'pet-pop-face'));
    m.appendChild(el('h2', 'treasure-name', pd.name));
    m.appendChild(el('p', 'subtitle', `${pd.line}<br><b>Earns 💰${tier.earn} after every fight you win.</b>`));
    if (addResult && addResult.full) {
      m.appendChild(el('p', '', `Your pet pouch is full (${run.petSlots}). Send one home to make room?`));
      run.pets.forEach((p, i) => {
        const cur = PETS[p.id];
        const b = el('button', 'btn secondary two-line', `Send ${cur.emoji} ${cur.name} home<small>earns 💰${petEarn(p)}</small>`);
        b.onclick = () => { R.swapPet(run, i, petId); saveRun(); close(); toast(`${pd.emoji} ${pd.name} joined you!`); onDone(); };
        m.appendChild(b);
      });
      const keep = el('button', 'btn', `Keep my pets (let ${pd.name} go)`);
      keep.onclick = () => { close(); onDone(); };
      m.appendChild(keep);
    } else {
      const b = el('button', 'btn gold', 'Welcome aboard! →');
      b.onclick = () => { saveRun(); close(); onDone(); };
      m.appendChild(b);
    }
  }, { dismissable: false });
  coachTip('pet', `🐾 Money pets earn coins after EVERY fight you win. You can carry ${run.petSlots}.`);
}
function showPetsModal() {
  modal(`🐾 Your money pets (${run.pets.length}/${run.petSlots})`, (m) => {
    if (!run.pets.length) m.appendChild(el('p', 'subtitle', 'No pets yet! Win them in fights.'));
    for (const p of run.pets) {
      const pd = PETS[p.id];
      const row = el('div', 'pet-row');
      row.appendChild(artImg(SK.petArt(p.id, curLook(), pd.world), pd.emoji, 'pet-face'));
      row.appendChild(el('div', 'pet-row-txt', `<b>${pd.name}</b> · ${PET_TIERS[pd.tier].label}<br>earns 💰${petEarn(p)} per win${p.fights >= 5 ? ' (grown +1!)' : ` · grows after ${5 - p.fights} more`}`));
      m.appendChild(row);
    }
  });
}

// ---------- the Arena prize ----------
function showArenaPrize(onDone) {
  const a = run.after;
  const rng = makeRng(run.seed ^ 0xA2E7A ^ run.world);
  const claimed = () => { a.prize = 'claimed'; saveRun(); };
  // resumed mid-choice: re-offer the same three rare cards (the sticker is already banked)
  if (a.prize === 'choosing' && a.rareCards) {
    return pickFromCards('🌟 Choose a rare card', a.rareCards, (id) => { run.deck.push(makeCard(id)); claimed(); useFreeStickers(onDone); });
  }
  const s = screen('center-stack');
  s.appendChild(el('div', 'crown', '🏆'));
  s.appendChild(el('h2', '', 'Pick your prize!'));
  const pet = el('button', 'btn gold two-line', '🐾 A SUPER money pet<small>earns 💰7 after every win</small>');
  const card = el('button', 'btn gold two-line', '🌟 A rare card + a free sticker<small>choose from 3 rare cards</small>');
  const lock = () => { pet.disabled = true; card.disabled = true; };
  pet.onclick = () => {
    if (a.prize !== 'pending') return;
    lock();
    const r = R.arenaPrize(run, 'pet', rng);
    claimed();
    showPetPop(r.pet, r.petResult, onDone);
  };
  card.onclick = () => {
    if (a.prize !== 'pending') return;
    lock();
    const r = R.arenaPrize(run, 'card', rng);
    a.prize = 'choosing'; a.rareCards = r.cards; saveRun();
    pickFromCards('🌟 Choose a rare card', r.cards, (id) => { run.deck.push(makeCard(id)); claimed(); useFreeStickers(onDone); });
  };
  s.append(pet, card);
}

// ================================================================= BOSS WIN → NEXT WORLD
function showBossSplash(st, rewards) {
  const s = screen('boss-splash');
  if (!REDUCED) {
    const confetti = el('div', 'confetti-layer');
    const bits = { w1: ['💗', '✨', '👑', '💎'], w2: ['🫧', '🟣', '🟡', '⭐'], w3: ['🫖', '🌸', '🎀', '🍰'] }[curLook()] || ['🎉'];
    for (let i = 0; i < 60; i++) {
      const c = el('span', 'confetto', bits[i % bits.length]);
      c.style.left = `${(i * 137) % 100}%`; c.style.animationDelay = `${(i % 20) * 0.14}s`; c.style.fontSize = `${0.8 + (i % 4) * 0.28}rem`;
      confetti.appendChild(c);
    }
    s.appendChild(confetti);
  }
  const W = WORLDS[run.world];
  s.prepend(bgLayer(SK.worldBg(run.world, 'battle'), 'battle-bg'));
  s.appendChild(artImg(SK.enemyArt(W.cousin), W.emoji, 'boss-intro-face'));
  s.appendChild(el('h1', 'splash-big', `${W.boss.split(',')[0].split(' the ')[0].toUpperCase()}: OUTPLAYED!`));
  const LINES = {
    stella: '"Fine. You can visit my Dreamhouse ANY time." — Stella 👑',
    lucy: '"Okay okay, that was pretty squishy of you." — Lucy 🫧',
    delilah: '"…Nuh-uh." — Delilah (she lost) 💅',
  };
  s.appendChild(el('div', 'speaker-line', LINES[W.cousin]));
  s.appendChild(el('p', 'subtitle', `+💰${rewards.coins}${rewards.pets.length ? ` · 🐾 +💰${rewards.pets.reduce((a, b) => a + b.earned, 0)}` : ''}`));
  const b = el('button', 'btn gold', run.world < WORLD_COUNT ? '👑 Collect your prize →' : '🏆 THE END?! →');
  b.onclick = () => {
    if (run.world >= WORLD_COUNT) return showVictory();
    const leaveWorld = () => {
      R.afterBoss(run);
      toast(run.sassLevel >= 5 ? '💖 You healed up a lot!' : '💖 All healed up for the next world!');
      const fromLook = curLook();
      R.advanceWorld(run);
      run.after = null;
      saveRun();
      const toLook = curLook();
      $app.innerHTML = '';
      SC.worldJump(sceneDeps(), { deck: run.deck, fromLook, toLook }, () => { markMovie(`jump${run.world}`); showWorldStory(); });
    };
    const a = run.after;
    if (a && a.treasurePicked) return run.freeStickers > 0 ? useFreeStickers(leaveWorld) : leaveWorld();
    pickTreasure('👑 Pick a BOSS TREASURE', rewards.bossTreasures || [], leaveWorld, (id) => { if (run.after) { run.after.treasurePicked = id; } });
  };
  s.appendChild(b);
  music.play('title');
}

// ================================================================= SHOP / REST / TREASURE
function showShop(shop) {
  const W = WORLDS[run.world];
  const s = sceneScreen(SK.worldBg(run.world, 'shop'), W.rooms.shop.ico, W.rooms.shop.name);
  s.appendChild(el('p', 'subtitle gold-line', `Your coins: 💰 <b>${run.coins}</b>`));
  if (shop.cards.length) {
    s.appendChild(el('p', 'subtitle', '<b>Cards</b>'));
    const row = el('div', 'reward-row');
    shop.cards.forEach((item, i) => {
      const d = cardFace(makeCard(item.id), { mini: true, price: item.price });
      if (run.coins < item.price) d.classList.add('cant-afford');
      else d.onclick = () => { if (R.shopBuyCard(run, shop, i)) { sfx.gold(); saveRun(); showShop(shop); } };
      row.appendChild(d);
    });
    s.appendChild(row);
  }
  if (shop.stickers.length) {
    s.appendChild(el('p', 'subtitle', '<b>Stickers</b> — one per card, lasts the whole run'));
    shop.stickers.forEach((item, i) => {
      const st = STICKERS[item.id];
      const b = el('button', 'btn gold two-line', `${st.emoji} ${st.name} — 💰${item.price}<small>${st.text} (goes on ${st.on})</small>`);
      b.disabled = run.coins < item.price;
      b.onclick = () => pickStickerTarget(item.id, (c) => {
        if (R.shopBuySticker(run, shop, i, c.uid)) { sfx.relic(); toast(`${st.emoji} Stuck on ${CARDS[c.id].name}!`); saveRun(); showShop(shop); }
      });
      s.appendChild(b);
    });
  }
  if (!shop.removed) {
    const b = el('button', 'btn secondary', `✂️ Remove a card from your deck — 💰${shop.removePrice}`);
    b.disabled = run.coins < shop.removePrice;
    b.onclick = () => pickCardModal('Remove which card?', run.deck.filter((c) => !CARDS[c.id].signature), (c) => {
      if (R.shopRemoveCard(run, shop, c.uid)) { sfx.play(); toast('✂️ Card removed!'); saveRun(); showShop(shop); }
    });
    s.appendChild(b);
  }
  if (run.freeStickers > 0) {
    const fb = el('button', 'btn gold', `✨ Use your ${run.freeStickers} free sticker${run.freeStickers > 1 ? 's' : ''}`);
    fb.onclick = () => useFreeStickers(() => showShop(shop));
    s.appendChild(fb);
  }
  const done = el('button', 'btn', 'All done →');
  done.onclick = () => { saveRun(); showMap(); };
  s.appendChild(done);
  coachTip('stickers', '✨ Stickers stay on a card for the WHOLE run. One sticker per card — put your best sticker on your best card!');
}
function pickStickerTarget(sid, onPick, onCancel = null) {
  const legal = run.deck.filter((c) => canSticker(c, sid) === true);
  if (!legal.length) { toast(`No card in your deck can take that sticker.`); if (onCancel) onCancel(); return; }
  pickCardModal(`${STICKERS[sid].emoji} Put it on which card?`, legal, onPick, { onCancel });
}
function useFreeStickers(onDone) {
  if (run.freeStickers <= 0) return onDone();
  modal(`✨ Free sticker! (${run.freeStickers} left)`, (m, close) => {
    for (const sid of STICKER_IDS) {
      const st = STICKERS[sid];
      const any = run.deck.some((c) => canSticker(c, sid) === true);
      const b = el('button', 'btn two-line', `${st.emoji} ${st.name}<small>${st.text}</small>`);
      b.disabled = !any;
      b.onclick = () => { close(); pickStickerTarget(sid, (c) => { R.applyFreeSticker(run, sid, c.uid); sfx.relic(); saveRun(); useFreeStickers(onDone); }, () => useFreeStickers(onDone)); };
      m.appendChild(b);
    }
    const later = el('button', 'btn secondary', 'Save it for later');
    later.onclick = () => { close(); onDone(); };
    m.appendChild(later);
  }, { dismissable: false });
}
function showRest() {
  const W = WORLDS[run.world];
  const s = sceneScreen(SK.worldBg(run.world, 'rest'), W.rooms.rest.ico, W.rooms.rest.name);
  s.appendChild(el('div', 'speaker-line', 'A cozy spot. Rest up, or practice one of your moves?'));
  const heal = el('button', 'btn', `😴 Rest (heal ${R.restHealAmount(run)} HP)`);
  heal.onclick = () => { sfx.heal(); const h = R.restHeal(run); toast(`❤️ +${h} HP`); saveRun(); showMap(); };
  s.appendChild(heal);
  const canUp = upgradableCards(run.deck).length > 0;
  const practice = el('button', 'btn gold', '⭐ Practice (upgrade a card)');
  practice.disabled = !canUp;
  practice.onclick = () => upgradePickModal(upgradableCards(run.deck), (c) => { if (R.restPractice(run, c.uid)) { sfx.relic(); toast(`⭐ ${CARDS[c.id].name}+!`); saveRun(); showMap(); } });
  s.appendChild(practice);
}
function showTreasure(tid) {
  const W = WORLDS[run.world];
  const s = sceneScreen(SK.worldBg(run.world, 'treasure'), W.rooms.treasure.ico, W.rooms.treasure.name);
  if (!tid) { s.appendChild(el('div', 'speaker-line', 'Empty! Somebody got here first.')); const b = el('button', 'btn', 'Onward →'); b.onclick = showMap; s.appendChild(b); return; }
  s.appendChild(el('div', 'speaker-line', 'Something is glowing inside…'));
  const b = el('button', 'btn gold', '🎁 Open it!');
  b.onclick = () => showTreasurePop(tid, () => { saveRun(); if (run.freeStickers > 0) useFreeStickers(showMap); else showMap(); });
  s.appendChild(b);
}
function showTreasurePop(tid, onDone) {
  const t = TREASURES[tid];
  sfx.relic();
  modal(null, (m, close) => {
    m.classList.add('treasure-pop');
    m.appendChild(el('h2', '', 'TREASURE!'));
    m.appendChild(el('div', 'treasure-emoji', t.emoji));
    m.appendChild(el('h2', 'treasure-name', t.name));
    m.appendChild(el('p', 'subtitle', t.text));
    const b = el('button', 'btn gold', 'WHOA! →');
    b.onclick = () => { close(); onDone(); };
    m.appendChild(b);
  }, { dismissable: false });
}
function pickTreasure(title, ids, onDone, onPicked = null) {
  if (!ids.length) return onDone();
  modal(title, (m, close) => {
    for (const id of ids) {
      const t = TREASURES[id];
      const b = el('button', 'btn gold two-line', `${t.emoji} ${t.name}<small>${t.text}</small>`);
      b.onclick = () => { R.gainTreasure(run, id); if (onPicked) onPicked(id); sfx.relic(); saveRun(); close(); if (run.freeStickers > 0) useFreeStickers(onDone); else onDone(); };
      m.appendChild(b);
    }
  }, { dismissable: false });
}

// ================================================================= PICKERS & MODALS
function showDeckModal(cards, title = 'My Deck') {
  modal(`${title} (${cards.length})`, (m) => {
    if (!cards.length) m.appendChild(el('p', 'subtitle', '(empty)'));
    const grid = el('div', 'deck-grid');
    for (const c of cards) grid.appendChild(cardFace(c, { mini: true }));
    m.appendChild(grid);
  });
}
function pickCardModal(title, cards, onPick, { onCancel = null } = {}) {
  modal(title, (m, close) => {
    const grid = el('div', 'deck-grid');
    for (const c of cards) {
      const f = cardFace(c, { mini: true });
      f.onclick = () => { close(); onPick(c); };
      grid.appendChild(f);
    }
    m.appendChild(grid);
    if (onCancel) {
      const back = el('button', 'btn secondary', '← Back');
      back.onclick = () => { close(); onCancel(); };
      m.appendChild(back);
    }
  }, { dismissable: !onCancel });
}
function pickFromCards(title, ids, onPick) {
  modal(title, (m, close) => {
    const grid = el('div', 'deck-grid');
    for (const id of ids) {
      const f = cardFace(makeCard(id), { mini: true });
      f.onclick = () => { close(); sfx.play(); onPick(id); };
      grid.appendChild(f);
    }
    m.appendChild(grid);
  }, { dismissable: false });
}
function multiPickDeck(title, cards, n, onDone) {
  const chosen = new Set();
  modal(title, (m, close) => {
    const grid = el('div', 'deck-grid');
    const go = el('button', 'btn gold', `Remove them (0/${n})`);
    go.disabled = true;
    for (const c of cards) {
      const f = cardFace(c, { mini: true });
      f.onclick = () => {
        if (chosen.has(c)) { chosen.delete(c); f.classList.remove('picked'); }
        else if (chosen.size < n) { chosen.add(c); f.classList.add('picked'); }
        go.textContent = `Remove them (${chosen.size}/${n})`;
        go.disabled = chosen.size !== Math.min(n, cards.length);
      };
      grid.appendChild(f);
    }
    m.appendChild(grid);
    go.onclick = () => { close(); onDone([...chosen]); };
    m.appendChild(go);
  }, { dismissable: false });
}
function multiUpgrade(n, onDone) {
  let left = n;
  const nextPick = () => {
    const ups = upgradableCards(run.deck);
    if (left <= 0 || !ups.length) return onDone();
    upgradePickModal(ups, (c) => { R.restPractice(run, c.uid); left -= 1; toast(`⭐ ${CARDS[c.id].name}+! (${left} left)`); nextPick(); }, `⭐ Upgrade ${left} more`);
  };
  nextPick();
}
function upgradePickModal(cards, onConfirm, heading = '⭐ Practice which move?') {
  modal(null, (m, close) => {
    const showList = () => {
      m.innerHTML = '';
      m.appendChild(el('h2', '', heading));
      const grid = el('div', 'deck-grid');
      for (const c of cards) { const f = cardFace(c, { mini: true }); f.onclick = () => showCompare(c); grid.appendChild(f); }
      m.appendChild(grid);
    };
    const showCompare = (c) => {
      m.innerHTML = '';
      m.appendChild(el('h2', '', '⭐ Practice makes perfect'));
      const row = el('div', 'upgrade-compare');
      row.appendChild(cardFace(c, { mini: true, extraCls: 'up-before' }));
      row.appendChild(el('div', 'up-arrow', '➜'));
      row.appendChild(cardFace({ ...c, up: true }, { mini: true, extraCls: 'up-after' }));
      m.appendChild(row);
      const yes = el('button', 'btn gold', '⭐ This one!');
      yes.onclick = () => { close(); onConfirm(c); };
      const back = el('button', 'btn secondary', '← Pick a different card');
      back.onclick = showList;
      m.append(yes, back);
    };
    showList();
  }, { dismissable: false });
}
const KEYWORD_INFO = [
  ['⚡ Energy', 'Cards cost ⚡. You get 3 fresh ⚡ every turn.'],
  ['🎯 Next move bubble', 'Shows what each enemy will do next. ⚔️ + a number = how hard it will hit you.'],
  ['♻️ Used up', 'After you play it, that card is gone until the NEXT fight.'],
  ['🫧 Squishy', 'Soaks up the first bit of damage every turn — big turns beat it.'],
  ['🫖 Tea Party Rules', 'Break the rule and you get a Sass card. A rule-breaking card glows orange first.'],
  ['🙄 Sass', 'A junk card. Tap it and Say Sorry (1 ⚡) to toss it. Gone after the fight.'],
  ['🟢 Slimed', 'That card costs 1 more for the rest of the fight.'],
  ['✨ Stickers', 'Stay on a card for the whole run. One per card.'],
  ['🐾 Money pets', 'Earn coins after every fight you win.'],
  ['🎟️ The Arena', 'Pay to enter. Three waves in a row. Win a SUPER prize.'],
];
function showHelpModal() {
  modal('📖 How to read the game', (m) => {
    m.appendChild(el('p', 'subtitle', '<b>Words</b>'));
    for (const [k, v] of KEYWORD_INFO) m.appendChild(el('p', 'deck-line', `<b>${k}</b> <span class="dim">${v}</span>`));
    m.appendChild(el('p', 'subtitle', '<b>Effects (tap any chip in a fight!)</b>'));
    for (const v of Object.values(STATUS_INFO)) m.appendChild(el('p', 'deck-line', `<span class="dim">${v}</span>`));
    if (run) {
      const MECH = {
        wyatt: '⚡ <b>Momentum</b>: every card you play this turn adds 1 (the card counts itself). It starts over each turn.',
        aaron: '🔨 <b>The Big Hammer</b>: always in your first hand. Sharpen, Temper and Anvil make it bigger for the rest of the fight.',
        liam: '🚽 <b>The Potty meter</b>: cards fill it. At 10 — FLUSH! 15 damage to EVERY enemy, and you get 5 Block. It empties after each fight.',
      };
      m.appendChild(el('p', 'subtitle', `<b>${HEROES[run.hero].name}</b>`));
      m.appendChild(el('p', 'deck-line', MECH[run.hero]));
    }
  });
}

// ================================================================= ENDINGS
const KILLER_SRC = { flush: { name: 'Your own FLUSH', emoji: '🚽' }, oops: { name: 'Bad luck', emoji: '😵' } };
function showDefeat() {
  releaseScreen();
  music.play('title');
  const st = combat; combat = null; prevSnap = null;
  const s = screen('look-base');
  s.appendChild(artImg(`assets/ui/ko_${run.hero}.jpg`, '🌧️', 'scene-art ko-art'));
  s.appendChild(el('h2', '', 'Outplayed… this time.'));
  const k = st && st.killedBy;
  if (k) {
    const info = k.name ? k : (KILLER_SRC[k.src] || KILLER_SRC.oops);
    const chip = el('div', 'killer-chip');
    chip.appendChild(artImg(k.artKey ? SK.enemyArt(k.artKey) : 'assets/none.jpg', info.emoji, 'killer-face'));
    chip.appendChild(el('div', 'killer-name', `taken down by<br><b>${String(info.name).toUpperCase()}</b>`));
    s.appendChild(chip);
  }
  s.appendChild(el('p', 'subtitle recap-line', `World ${run.world}: ${WORLDS[run.world].short} · Floor ${run.floor} · ⚔️ ${run.stats.fights + run.stats.elites} fights won · 🐾 ${run.pets.length} pets`));
  s.appendChild(el('div', 'speaker-line', `"${nextLossLine()}" — Coach James`));
  clearSave();
  const b = el('button', 'btn', '🔁 Try again');
  b.onclick = showTitle;
  s.appendChild(b);
}
// Wyatt's ending (hero-specific, in-engine) → the song: the music video if it's here,
// else the synced-lyric karaoke credits (offline-safe fallback).
function playEnding(hero, onDone) {
  music.play(null);
  SC.endingCutscene(sceneDeps(), hero, () => {
    SC.playEndingVideo(sceneDeps(), onDone, () => creditsRoll(hero, { el, artImg, sfx, REDUCED }, onDone));
  });
}
function showVictory() {
  const heroId = run.hero;
  const p = loadProfile();
  p.wins[heroId] = (p.wins[heroId] || 0) + 1;
  const newSass = Math.min(10, Math.max(p.sassMax || 0, (run.sassLevel || 0) + 1));
  const unlocked = newSass > (p.sassMax || 0);
  p.sassMax = newSass;
  p.movies.ending = 1; p.movies.song = 1;
  saveProfile(p);
  const sl = run.sassLevel;
  const secrets = (run.secrets || []).length;
  clearSave();
  prefetch(['assets/audio/ending.mp3', 'assets/audio/ending.lrc']);
  playEnding(heroId, () => showCrown(heroId, sl, unlocked, newSass, secrets));
}
function showCrown(heroId, sl, unlocked, newSass, secrets = 0) {
  music.play('title');
  const s = screen('look-base crown-screen');
  s.appendChild(el('div', 'crown', '👑'));
  s.appendChild(el('h1', '', 'THE COUSINS ARE OUTPLAYED!'));
  const LINES = {
    wyatt: '"Stella was fabulous. Lucy was squishy. Delilah was SASSY. But nobody is faster than WYATT THE SPEEDY!" ⚡',
    aaron: '"Three worlds. Three cousins. One Big Hammer. AARON THE STRONG!" 🔨',
    liam: '"Delilah said nuh-uh. Liam said FLUSH. LIAM THE POTTY TRAINED!" 🚽',
  };
  s.appendChild(artImg(SK.heroArt(heroId, 'base'), HEROES[heroId].emoji, 'scene-art'));
  s.appendChild(el('div', 'speaker-line', LINES[heroId]));
  if (sl) s.appendChild(el('p', 'subtitle', `💅 …on Sass Level ${sl}!`));
  if (unlocked) s.appendChild(el('div', 'speaker-line', `💅 <b>Sass Level ${newSass} unlocked!</b> Pick it when you start a new game. ${C.SASS_LEVELS[newSass]}`));
  s.appendChild(el('p', 'subtitle', secrets >= 3 ? '🤫 You found ALL 3 cousin secrets!' : `🤫 You found ${secrets} of 3 cousin secrets. Look closer next time…`));
  const again = el('button', 'btn secondary', '🎬 Watch the ending again');
  again.onclick = () => playEnding(heroId, () => showCrown(heroId, sl, false, newSass));
  const home = el('button', 'btn gold', '🏠 Back to the title');
  home.onclick = showTitle;
  s.append(again, home);
}

// ================================================================= BOOT
music.arm();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
{
  const rh = document.createElement('div');
  rh.className = 'rotate-hint';
  rh.innerHTML = '<span class="rh-icon">📱</span>Turn your screen tall-ways to play!';
  document.body.appendChild(rh);
}
// tap-to-explain everywhere (kids can't hover)
document.addEventListener('click', (ev) => {
  if (!ev.target.closest) return;
  if (ev.target.closest('.enemy.targetable')) return;
  const chip = ev.target.closest('.chip[data-status]');
  if (chip && STATUS_INFO[chip.dataset.status]) {
    toast(STATUS_INFO[chip.dataset.status], 2800);
    markFxSeen(chip.dataset.status);
    document.querySelectorAll(`.chip[data-status="${chip.dataset.status}"]`).forEach((c) => c.classList.remove('chip-new'));
    ev.stopPropagation();
    return;
  }
  const pchip = ev.target.closest('.chip[data-power]');
  if (pchip && combat && POWER_INFO[pchip.dataset.power]) { toast(POWER_INFO[pchip.dataset.power].text(combat.hero.powers[pchip.dataset.power]), 3000); ev.stopPropagation(); return; }
  const it = ev.target.closest('.intent[data-intent]');
  if (it) { const fn = INTENT_KIND_INFO[it.dataset.intent]; if (fn) toast(fn(it.dataset.name || 'its move', it.dataset.dmg || ''), 3200); ev.stopPropagation(); return; }
  if (ev.target.closest('.energy-orb')) { toast('⚡ Energy: cards cost ⚡. You get 3 fresh ⚡ every turn.'); return; }
  const meter = ev.target.closest('.hero-meter');
  if (meter && combat) {
    const T = {
      momentum: `⚡ Momentum ${combat.momentum}: every card you play this turn adds 1. "Momentum 3+" cards turn on at 3!`,
      hammer: `🔨 Your Big Hammer hits for ${C.attackValue(C.hammerDamage(combat), combat.hero)} right now. Forge cards make it bigger for the whole fight!`,
      potty: `🚽 Potty ${combat.potty}/10. At 10: FLUSH! — 15 damage to EVERY enemy + 5 Block.`,
    };
    toast(T[meter.dataset.meter] || '', 3200);
  }
}, true);

const preview = /^#(credits|ending)$/.exec(location.hash);
if (preview) { run = null; playEnding('wyatt', showTitle); } else showTitle();

// e2e/debug handle (+ dev jumps for tests/screenshots — harmless in play)
window.__RL4 = {
  get run() { return run; }, get combat() { return combat; }, get wakeHeld() { return !!wakeLock; }, R, C, showTitle,
  dev: {
    start(heroId = 'wyatt', seed = 4242, world = 1) {
      run = R.newRun(heroId, seed);
      while (run.world < world) R.advanceWorld(run);
      run.visitorDone = true;
      saveRun();
      showMap();
    },
    fight(keys, kind = 'fight', rule = null) { if (!run) this.start(); startFight({ enemies: keys, rule }, kind); },
    arena() { if (!run) this.start(); run.coins = 999; showArena(R.arenaInfo(run)); },
    shop() { if (!run) this.start(); showShop(R.makeShop(run, makeRng(99))); },
    rest() { if (!run) this.start(); showRest(); },
    visitor() { if (!run) this.start(); run.visitorDone = false; showVisitor(); },
    victory() { if (!run) this.start('wyatt', 1, 3); showVictory(); },
    defeat() { if (!run) this.start(); combat = null; showDefeat(); },
    jump(from = 'base', to = 'w1') { if (!run) this.start(); SC.worldJump(sceneDeps(), { deck: run.deck, fromLook: from, toLook: to }, showMap); },
    squeeze() { SC.squeezeOut(sceneDeps(), showTitle); },
    ending(hero = 'wyatt') { SC.endingCutscene(sceneDeps(), hero, showTitle); },
    win() { if (combat) { for (const e of C.livingEnemies(combat)) e.hp = 0; combat.waves = null; C.checkCombatEnd(combat); afterAction(); } },
    refresh() { afterAction(); },
    // the same cards in all four looks, side by side (polish floor 14; test/smoke.mjs)
    looks(ids) {
      const s = screen('look-base center-stack');
      s.appendChild(el('h2', '', 'One card, four worlds'));
      for (const id of ids) {
        const row = el('div', 'reward-row');
        for (const look of SK.LOOKS) row.appendChild(cardFace(makeCard(id), { look, mini: true }));
        s.appendChild(row);
      }
    },
    // any screen by name, in the current world's look (the smoke tour, test/smoke.mjs)
    screen(name) {
      if (!run) this.start();
      const rng = makeRng(7);
      const after = (kind, extra = {}) => { run.after = { kind, rewards: R.fightRewards(run, kind, rng), petDone: true, prize: null, ...extra }; };
      const S = {
        title: showTitle, settings: showSettings, movies: showMovies, saveCode: showSaveCode, heroes: showHeroSelect,
        story: showWorldStory, visitor: () => this.visitor(), map: showMap, defeat: () => this.defeat(), rest: () => this.rest(),
        deck: () => { showMap(); showDeckModal(run.deck); },
        pets: () => { showMap(); showPetsModal(); },
        treasure: () => showTreasure(Object.keys(TREASURES)[0]),
        boss: () => bossIntro({ enemies: WORLDS[run.world].encounters.boss[0] }),
        reward: () => { after('fight'); continueAfter(); },
        pet: () => { showMap(); showPetPop(Object.keys(PETS).find((id) => PETS[id].world === run.world), { full: false }, showMap); },
        arenaPrize: () => { after('arena', { prize: 'pending' }); continueAfter(); },
        bossSplash: () => { after('boss'); showBossSplash(null, run.after.rewards); },
      };
      S[name]();
    },
  },
};
