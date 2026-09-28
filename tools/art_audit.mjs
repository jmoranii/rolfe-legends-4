// art_audit.mjs — every art/music hook the game can load, checked against deployed files.
// Emoji/silence fallbacks keep a missing file from breaking anything; this reports what's
// still falling back.   node tools/art_audit.mjs
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CARDS, HEROES } from '../js/cards.js';
import { ENEMIES } from '../js/enemies.js';
import { PETS } from '../js/pets.js';
import { WORLDS } from '../js/worlds.js';
import * as SK from '../js/skins.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = (p) => existsSync(join(ROOT, p));
const groups = {};
const want = (group, path) => { (groups[group] || (groups[group] = { ok: 0, missing: [] })); if (has(path)) groups[group].ok++; else groups[group].missing.push(path); };

for (const h of Object.keys(HEROES)) for (const l of SK.LOOKS) want('hero portraits', `assets/heroes/${h}_${l}.jpg`);
for (const id of Object.keys(CARDS)) {
  if (id === 'sass') { want('cards', 'assets/cards/sass_w3.jpg'); continue; }
  for (const l of SK.LOOKS) want('cards', `assets/cards/${id}_${l}.jpg`);
}
const extraArt = ['lucy_mega', 'delilah_tantrum'];
for (const k of [...Object.keys(ENEMIES), ...extraArt]) want('enemies & cousins', `assets/enemies/${k}.jpg`);
for (const [id, p] of Object.entries(PETS)) for (let w = p.world; w <= 3; w++) want('pets', `assets/pets/${id}_w${w}.jpg`);
for (const w of [1, 2, 3]) {
  for (const k of ['battle', 'map', 'shop', 'rest', 'treasure', 'arena', 'story']) want('world backgrounds', `assets/bg/w${w}_${k}.jpg`);
  want('visitors', `assets/visitors/${WORLDS[w].visitor.art}.jpg`);
}
for (const s of ['farm_start', 'plunge_w1', 'swallow_w2', 'squeeze_out', 'arrive_w3']) want('scenes', `assets/scenes/${s}.jpg`);
for (const e of ['1_window', '2_wyatt', '2_aaron', '2_liam', '3_girls', '4_farm', '5_car', '6_lane', '7_heroes']) want('ending', `assets/ending/${e}.jpg`);
for (const u of ['title.jpg', 'portrait_coach.jpg', 'ko_wyatt.jpg', 'ko_aaron.jpg', 'ko_liam.jpg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) want('ui', `assets/ui/${u}`);
for (const t of ['title', 'world1', 'world2', 'world3', 'boss', 'ending', 'boss_stella', 'boss_lucy', 'boss_delilah']) want('music', `assets/audio/${t}.mp3`);
want('music', 'assets/audio/ending.lrc');
want('ending video', 'assets/video/ending.mp4');

let total = 0, ok = 0;
for (const [g, r] of Object.entries(groups)) {
  const n = r.ok + r.missing.length;
  total += n; ok += r.ok;
  console.log(`${r.missing.length ? '⏳' : '✅'} ${g.padEnd(18)} ${r.ok}/${n}${r.missing.length && r.missing.length <= 6 ? '  missing: ' + r.missing.join(', ') : ''}`);
}
console.log(`\n${ok}/${total} art & music hooks present`);
process.exitCode = ok === total ? 0 : 1;
