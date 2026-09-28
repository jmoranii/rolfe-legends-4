// script.mjs — every line of dialogue, story, and song in the game, in play order, written
// into REVIEW.md between the script markers (the Definition of done asks REVIEW.md for all
// dialogue and lyric drafts). Pulls from the modules; the few lines that live inside
// game.js/scenes.js functions are read from the source.   node tools/script.mjs
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WORLDS } from '../js/worlds.js';
import { HEROES } from '../js/cards.js';
import { PETS } from '../js/pets.js';
import { TIPS_GENERAL, TIPS_HERO, LOSS_LINES } from '../js/tips.js';
import { endingShots } from '../js/scenes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
const GAME = src('js/game.js'), SCENES = src('js/scenes.js');
// the quoted strings inside a `const NAME = { … };` / `[ … ];` block (after `from`, if given)
function block(text, name, from = '') {
  const i = text.indexOf(`const ${name} =`, from ? text.indexOf(from) : 0);
  let j = text.indexOf('=', i) + 1;
  while (!'{['.includes(text[j])) j++;
  const open = j;
  for (let depth = 0; j < text.length; j++) { if ('{['.includes(text[j])) depth++; else if ('}]'.includes(text[j]) && --depth === 0) break; }
  return text.slice(open, j + 1);
}
const quoted = (s) => [...s.matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
const clean = (s) => s.replace(/<br\s*\/?>/g, ' ').replace(/<\/?b>/g, '**').replace(/<[^>]+>/g, '');

const out = [];
const H = (t) => out.push('', `### ${t}`, '');
const L = (who, line) => out.push(`- ${who ? `**${who}:** ` : ''}${clean(line)}`);

H('The farm (every run starts here)');
L('Story card', 'BACK ON THE FARM — Just a normal day on the farm…');
for (const h of Object.values(HEROES)) L(h.name, `${h.name} is ready for anything… until a SPARKLY PINK PORTAL opens in the barn door! 💗`);
L('Hero pick', 'Who takes on the cousins?');
for (const h of Object.values(HEROES)) L(`${h.name} (tagline)`, h.tagline);

const JUMP = Object.fromEntries(quoted(block(SCENES, 'JUMP_COPY')).filter(([k]) => k === 'line').map(([, v], i) => [`w${i + 1}`, v]));
const BOSS = Object.fromEntries(quoted(block(GAME, 'BOSS_LINES')));
const SPLASH = Object.fromEntries(quoted(block(GAME, 'LINES', 'function showBossSplash')));
const SECRET = Object.fromEntries(quoted(block(GAME, 'SECRET_LINES')));
for (const w of [1, 2, 3]) {
  const W = WORLDS[w];
  H(`World ${w}: ${W.name}`);
  L('World-jump', JUMP[`w${w}`]);
  L('Story card', `${W.story.sub} ${W.story.line} Watch out: ${W.challenge}`);
  L(W.visitor.who, W.visitor.line);
  if (w === 2) { L('The Squeeze Out', 'You squeezed and squeezed… and squeezed OUT!'); L('The Squeeze Out', '…and **Lucy** was waiting for you. 🫧👑'); }
  L(`${W.boss} (boss intro)`, BOSS[W.cousin]);
  L(`${W.boss.split(',')[0].split(' the ')[0]} (secret wink: tap her portrait 3× on her intro, +💰10)`, SECRET[W.cousin]);
  L(`${W.boss.split(',')[0].split(' the ')[0]} (outplayed)`, SPLASH[W.cousin]);
  const pets = Object.values(PETS).filter((p) => p.world === w);
  L('Money pets', pets.map((p) => `${p.emoji} ${p.name}: “${p.line}”`).join(' · '));
}

H('The ending (Wyatt’s design, shot by shot; the second shot depends on the hero)');
const shots = endingShots('wyatt');
shots.forEach((s, i) => {
  if (i === 1) for (const h of ['wyatt', 'aaron', 'liam']) L(`Shot 2 (${h})`, endingShots(h)[1].text);
  else L(`Shot ${i + 1}`, s.text);
});
const CROWN = Object.fromEntries(quoted(block(GAME, 'LINES', 'function showCrown')));
for (const [h, line] of Object.entries(CROWN)) L(`Crown (${h})`, line);

H('Coach James (tips after fights, and after a loss)');
const beats = [...block(GAME, 'BEAT_LINES').matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\$\{n\}/g, '[enemy]'));
L('After a win', beats.join(' · '));
for (const t of TIPS_GENERAL) L('Tip', t);
for (const [h, ts] of Object.entries(TIPS_HERO)) for (const t of ts) L(`Tip (${h})`, t);
for (const t of LOSS_LINES) L('After a loss', t);

H('The ending song — “Attack of the Cousins” (as sung; the on-screen captions spell Wyatt, Liam, Savanah)');
out.push('```', src('assets/lyrics/ending.txt').trim(), '```');

const START = '<!-- script:start (node tools/script.mjs) -->', END = '<!-- script:end -->';
const review = src('REVIEW.md');
const body = `${START}\n${out.join('\n').trim()}\n${END}`;
const next = review.includes(START) ? review.replace(new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`), body) : `${review.trimEnd()}\n\n## 7. The whole script — every line the boys will read or hear\n\nGenerated from the game's code, in play order. Edit the code, then rerun \`node tools/script.mjs\`.\n\n${body}\n`;
writeFileSync(join(ROOT, 'REVIEW.md'), next);
console.log(`${out.filter((l) => l.startsWith('- ')).length} lines + the lyrics → REVIEW.md §7`);
