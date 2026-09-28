// Rolfe Legends 4 smoke tour: every screen in every world look, screenshotted into
// docs/smoke/<look>/ with a contact sheet per look (GOAL Phase 7: "every-screen smoke
// screenshots per world look"). Also counts, per screen, the art slots still showing an
// emoji and the cards/pets wearing a fallback painting instead of this world's.
// Chromium only; the dual-engine checks live in e2e.mjs.
//   node test/smoke.mjs          (self-hosts the repo on :8205 if nothing answers)
import { createRequire } from 'module';
import http from 'http';
import { readFile, mkdir, rm, writeFile } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WORLDS } from '../js/worlds.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = 8205;
const BASE = `http://localhost:${PORT}`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'smoke');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.lrc': 'text/plain', '.mp4': 'video/mp4' };
let server = null;
try { await fetch(BASE, { signal: AbortSignal.timeout(1500) }); } catch {
  server = http.createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, BASE).pathname);
      if (path.endsWith('/')) path += 'index.html';
      const data = await readFile(join(ROOT, path));
      res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
      res.end(data);
    } catch { res.writeHead(404).end(); }
  }).listen(PORT);
}

const rl4 = (page, fn, arg) => page.evaluate(fn, arg);
async function zapTips(page) {
  for (let i = 0; i < 5; i++) {
    if (await page.locator('.coach-bubble').count() === 0) break;
    await page.locator('.coach-bubble').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}
// every <img> settled + every background probe done, then count what fell back
async function artStats(page) {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(350);
  return rl4(page, () => {
    const slots = [...document.querySelectorAll('.art-slot')].filter((s) => s.offsetParent !== null);
    const emoji = slots.filter((s) => s.classList.contains('art-emoji')).length;
    let fallback = 0; // a card/pet/hero wearing its base or home-world painting inside a world look
    for (const img of document.querySelectorAll('.cardface img, .pet-face img, .pet-pop-face img, .hero-face-combat img')) {
      const host = img.closest('[class*="look-w"]');
      const look = host && [...host.classList].find((c) => /^look-w\d$/.test(c));
      if (look && !img.src.includes(`_${look.slice(5)}.jpg`)) fallback++;
    }
    const bgMissing = [...document.querySelectorAll('[data-bg]:not(.has-art)')].length; // painted backdrops that didn't load
    return { slots: slots.length, emoji, fallback, bgMissing };
  });
}

const results = [];
async function capture(page, look, name) {
  await zapTips(page);
  const stats = await artStats(page);
  await mkdir(join(OUT, look), { recursive: true });
  await page.screenshot({ path: join(OUT, look, `${name}.jpg`), type: 'jpeg', quality: 62 });
  results.push({ look, name, ...stats });
}

const HEROES = ['wyatt', 'aaron', 'liam'];

// [look, screen name, setup(page)] — each step starts from a fresh page load
function tour() {
  const steps = [
    ['base', 'title', async () => {}],
    ['base', 'heroes', async (p) => { await p.locator('.btn', { hasText: 'Play' }).click(); }],
    ['base', 'farm-intro', async (p) => { await p.locator('.btn', { hasText: 'Play' }).click(); await p.locator('.hero-card', { hasText: 'Wyatt' }).click(); }],
    ['base', 'settings', async (p) => { await p.locator('.btn', { hasText: 'Settings' }).click(); }],
    ['base', 'title-after-a-win', async (p) => { await rl4(p, () => { localStorage.setItem('rl4_profile', JSON.stringify({ wins: { wyatt: 2, liam: 1 }, sassMax: 2, movies: { intro: 1, jump2: 1, squeeze: 1, jump3: 1, ending: 1, song: 1 } })); window.__RL4.showTitle(); }); }],
    ['base', 'movies', async (p) => { await rl4(p, () => { localStorage.setItem('rl4_profile', JSON.stringify({ wins: { wyatt: 1 }, sassMax: 1, movies: { intro: 1, jump2: 1, squeeze: 1, jump3: 1, ending: 1, song: 1 } })); window.__RL4.showTitle(); }); await p.locator('.btn', { hasText: 'Movies' }).click(); }],
    ['base', 'sass-level-pick', async (p) => { await rl4(p, () => { localStorage.setItem('rl4_profile', JSON.stringify({ wins: { wyatt: 1 }, sassMax: 3, movies: {} })); window.__RL4.showTitle(); }); await p.locator('.btn', { hasText: 'Play' }).click(); await p.locator('.hero-card', { hasText: 'Aaron' }).click(); }],
    ['base', 'jump-to-dreamhouse', async (p) => { await rl4(p, () => { window.__RL4.dev.start('wyatt', 4242, 1); window.__RL4.dev.jump('base', 'w1'); }); await p.waitForSelector('.jump-grid .mini-card.look-w1', { timeout: 8000 }).catch(() => {}); }],
  ];
  for (const w of [1, 2, 3]) {
    const L = `w${w}`, W = WORLDS[w], E = W.encounters;
    const start = (hero = 'wyatt', seed = 4242) => (p) => rl4(p, ([h, s, ww]) => window.__RL4.dev.start(h, s, ww), [hero, seed, w]);
    const scr = (name) => async (p) => { await start()(p); await rl4(p, (n) => window.__RL4.dev.screen(n), name); };
    const rule = w === 3 ? 'pinkies_out' : null;
    steps.push(
      [L, 'story', scr('story')],
      [L, 'visitor', scr('visitor')],
      [L, 'map', scr('map')],
      ...HEROES.map((h) => [L, `fight-${h}`, async (p) => { await start(h, 100 + w)(p); await rl4(p, ([k, r]) => window.__RL4.dev.fight(k, 'fight', r), [E.hard[0], rule]); }]),
      [L, 'tough-fight', async (p) => { await start('aaron')(p); await rl4(p, ([k, r]) => window.__RL4.dev.fight(k, 'elite', r), [E.elite[0], rule]); }],
      [L, 'boss-intro', scr('boss')],
      [L, 'boss-fight', async (p) => { await start('liam')(p); await rl4(p, (k) => window.__RL4.dev.fight(k, 'boss'), E.boss[0]); }],
      [L, 'arena', async (p) => { await start()(p); await rl4(p, () => window.__RL4.dev.arena()); }],
      [L, 'reward', scr('reward')],
      [L, 'money-pet', scr('pet')],
      [L, 'arena-prize', scr('arenaPrize')],
      [L, 'shop', async (p) => { await start()(p); await rl4(p, () => { window.__RL4.run.coins = 200; window.__RL4.dev.shop(); }); }],
      [L, 'rest', scr('rest')],
      [L, 'treasure', scr('treasure')],
      [L, 'deck', scr('deck')],
      [L, 'boss-beaten', scr('bossSplash')],
      [L, 'defeat', scr('defeat')],
    );
    if (w < 3) steps.push([L, `jump-to-w${w + 1}`, async (p) => { await start()(p); await rl4(p, ([a, b]) => window.__RL4.dev.jump(a, b), [L, `w${w + 1}`]); await p.waitForSelector(`.jump-grid .mini-card.look-w${w + 1}`, { timeout: 8000 }).catch(() => {}); }]);
  }
  steps.push(
    ['w2', 'squeeze-out', async (p) => { await rl4(p, () => { window.__RL4.dev.start('wyatt', 4242, 2); window.__RL4.dev.squeeze(); }); }],
    ['w3', 'delilah-tantrum', async (p) => { await rl4(p, () => { window.__RL4.dev.start('aaron', 4242, 3); window.__RL4.dev.fight(['delilah'], 'boss'); const st = window.__RL4.combat; st.hero.hp = st.hero.maxHp = 999; const d = st.enemies[0]; d.shield = 0; window.__RL4.C.dealDamage(st, d, 9999, { attacker: st.hero }); window.__RL4.dev.refresh(); }); }],
    ['w3', 'victory', async (p) => { await rl4(p, () => { window.__RL4.dev.start('wyatt', 4242, 3); window.__RL4.dev.victory(); }); }],
  );
  return steps;
}

for (const d of ['base', 'w1', 'w2', 'w3', 'ending', 'phone']) await rm(join(OUT, d), { recursive: true, force: true }); // e2e.mjs keeps its own shots in e2e/
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
for (const [look, name, setup] of tour()) {
  await page.goto(BASE, { waitUntil: 'load' });
  await rl4(page, () => { localStorage.clear(); document.querySelectorAll('.modal-veil,.cutscene').forEach((m) => m.remove()); });
  try { await setup(page); } catch (e) { errors.push(`${look}/${name}: ${e.message.split('\n')[0]}`); }
  await page.waitForTimeout(500);
  await capture(page, look, name);
}
// the ending, shot by shot (a tap advances it)
await page.goto(BASE, { waitUntil: 'load' });
await rl4(page, () => window.__RL4.dev.ending('wyatt'));
for (let i = 0; i < 7; i++) {
  await page.waitForTimeout(700);
  await capture(page, 'ending', `shot-${i + 1}`);
  await page.locator('.cutscene.ending').click({ position: { x: 380, y: 300 } }).catch(() => {});
}
// polish floor 14: the same card recognizable in all four looks, at tablet and phone size
const LOOK_CARDS = ['kick', 'big_hammer', 'waddle', 'forged_in_rolfe', 'royal_throne'];
await page.goto(BASE, { waitUntil: 'load' });
await rl4(page, (ids) => window.__RL4.dev.looks(ids), LOOK_CARDS);
await capture(page, 'base', 'card-looks');
// phones: the three screens the boys see most, one per world
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
const pp = await phone.newPage();
for (const [w, name, fn] of [[1, 'map', (p) => rl4(p, () => window.__RL4.dev.screen('map'))], [2, 'fight', (p) => rl4(p, (k) => window.__RL4.dev.fight(k, 'fight'), ['splat_ball', 'sticky_hand'])], [3, 'shop', (p) => rl4(p, () => window.__RL4.dev.shop())]]) {
  await pp.goto(BASE, { waitUntil: 'load' });
  await rl4(pp, ([ww]) => window.__RL4.dev.start('aaron', 4242, ww), [w]);
  await fn(pp);
  await pp.waitForTimeout(500);
  await capture(pp, 'phone', `w${w}-${name}`);
}
await pp.goto(BASE, { waitUntil: 'load' });
await rl4(pp, (ids) => window.__RL4.dev.looks(ids), LOOK_CARDS);
await capture(pp, 'phone', 'card-looks');

// contact sheets: one page per look, rendered by the same browser
const byLook = {};
for (const r of results) (byLook[r.look] || (byLook[r.look] = [])).push(r);
for (const [look, rows] of Object.entries(byLook)) {
  const html = `<html><body style="margin:0;background:#222;font:14px system-ui;color:#eee;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">${rows.map((r) => `<figure style="margin:0"><img src="${BASE}/docs/smoke/${look}/${r.name}.jpg" style="width:100%;display:block;border-radius:6px"><figcaption style="padding:3px 2px">${r.name}${r.emoji ? ` · ⚠️ ${r.emoji} emoji` : ''}${r.fallback ? ` · ${r.fallback} fallback` : ''}${r.bgMissing ? ` · ⚠️ ${r.bgMissing} bg missing` : ''}</figcaption></figure>`).join('')}</body></html>`;
  const sp = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await sp.setContent(html, { waitUntil: 'load' });
  await sp.screenshot({ path: join(OUT, `sheet-${look}.jpg`), type: 'jpeg', quality: 70, fullPage: true });
  await sp.close();
}
await browser.close();
if (server) server.close();

const table = ['| look | screen | art slots | still emoji | fallback art | backdrop missing |', '|---|---|---|---|---|---|', ...results.map((r) => `| ${r.look} | ${r.name} | ${r.slots} | ${r.emoji || ''} | ${r.fallback || ''} | ${r.bgMissing || ''} |`)].join('\n');
await writeFile(join(OUT, 'README.md'), `# Smoke tour\n\nGenerated by \`node test/smoke.mjs\` — ${results.length} screens across the farm, the three world looks, the ending, and phones. Contact sheets: ${Object.keys(byLook).map((l) => `[${l}](sheet-${l}.jpg)`).join(' · ')}.\n\n${table}\n`);
const sum = (k) => results.reduce((a, r) => a + r[k], 0);
console.log(`${results.length} screens · ${sum('emoji')} art slots still on emoji · ${sum('fallback')} on a fallback painting · ${sum('bgMissing')} backdrops missing · ${errors.length} page errors`);
for (const e of errors) console.log('  ✗', e);
process.exitCode = errors.length ? 1 : 0;
