// Rolfe Legends 4 e2e: drives the real UI headless in BOTH engines (the boys' tablets
// are Safari/Silk). Covers: title → hero → farm intro → world-jump → story → visitor →
// map → a real fight by taps → victory beat → reward → save/reload; the world looks;
// Tea Party Rules glow; Say Sorry; the Arena; the shop + stickers; the Squeeze Out;
// Delilah's TANTRUM; a FULL scripted run through all three worlds and the ending;
// offline boot; the shared-origin service worker; smoke screenshots per world look.
//   node test/e2e.mjs            (self-hosts the repo on :8204 if nothing answers)
// WEBKIT PIN: playwright stays at 1.60.0 on this Mac (macOS 14's frozen WebKit build
// hangs on ≥1.61). Missing-asset 404s are by design (drop-in art/music layers).
import { createRequire } from 'module';
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { webkit, chromium } = require('playwright');

const PORT = 8204;
const BASE = `http://localhost:${PORT}`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'smoke', 'e2e');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.lrc': 'text/plain', '.mp4': 'video/mp4' };
let ownServer = null;
try { await fetch(BASE, { signal: AbortSignal.timeout(1500) }); } catch {
  ownServer = http.createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, BASE).pathname);
      if (path.endsWith('/')) path += 'index.html';
      const data = await readFile(join(ROOT, path));
      const type = MIME[extname(path)] || 'application/octet-stream';
      // byte ranges, like GitHub Pages (Safari won't play video from a server without them)
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (m) {
        const start = m[1] ? +m[1] : Math.max(0, data.length - +m[2]);
        const end = m[1] && m[2] ? Math.min(+m[2], data.length - 1) : data.length - 1;
        res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
        return res.end(data.subarray(start, end + 1));
      }
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes' });
      res.end(data);
    } catch { res.writeHead(404).end(); }
  }).listen(PORT);
  console.log(`(self-hosting the repo on :${PORT})`);
}
await mkdir(SHOTS, { recursive: true });

const results = [];
function ok(cond, msg) { results.push([!!cond, msg]); if (!cond) console.log('  ✗', msg); }
// outcome asserts save a screenshot when they fail (Polish floor 9)
async function okShot(page, cond, msg) {
  ok(cond, msg);
  if (!cond) {
    await mkdir(join(ROOT, 'test-results'), { recursive: true });
    await page.screenshot({ path: join(ROOT, 'test-results', `${msg.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.png`) }).catch(() => {});
  }
}
async function zapTips(page) {
  for (let i = 0; i < 5; i++) {
    if (await page.locator('.coach-bubble').count() === 0) break;
    await page.locator('.coach-bubble').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}
async function newPage(browser, { mobile = false } = {}) {
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 768, height: 1024 }, reducedMotion: 'reduce' });
  page._errors = [];
  // WebKit reports an idle prefetch that a test reload cuts off as a page error too (benign)
  page.on('pageerror', (e) => { if (!String(e).includes('due to access control checks')) page._errors.push(String(e)); });
  // 404s are by design (drop-in layers); WebKit also logs an idle prefetch that a test reload cuts off
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('Failed to load resource') && !t.includes('due to access control checks')) page._errors.push(t); });
  return page;
}
async function shot(page, name) { await page.waitForTimeout(250); await page.screenshot({ path: join(SHOTS, `${name}.jpg`), type: 'jpeg', quality: 60 }); }
const rl4 = (page, fn, arg) => page.evaluate(fn, arg);

// ---------------------------------------------------------------- the real UI, by taps
async function uiSuite(browserType, name) {
  const browser = await browserType.launch({ timeout: 30000 });
  const page = await newPage(browser, { mobile: name === 'webkit' });
  await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
  ok(await page.locator('.title-logo').count() === 1, `${name}: title renders`);
  if (name === 'chromium') await shot(page, 'title');
  await page.locator('.btn', { hasText: 'Play' }).click();
  ok(await page.locator('.hero-card').count() === 3, `${name}: three heroes to pick`);
  await page.locator('.hero-card', { hasText: 'Aaron' }).click();
  ok(await page.locator('.cutscene.story').count() === 1, `${name}: the farm intro plays`);
  await page.locator('.btn', { hasText: 'Jump in' }).click();
  ok(await page.locator('.cutscene.jump').count() === 1, `${name}: the world-jump scene plays`);
  ok(await page.locator('.jump-grid .mini-card.look-base').count() > 0, `${name}: the deck starts in the farm look`);
  if (name === 'chromium') await shot(page, 'worldjump-before');
  await page.waitForSelector('.jump-grid .mini-card.look-w1', { timeout: 8000 }).then(() => ok(true, `${name}: every card lands in the Dreamhouse look`), () => ok(false, `${name}: every card lands in the Dreamhouse look`));
  await page.locator('.cutscene-skip').click();
  await page.waitForSelector('.cutscene.story .story-name', { timeout: 5000 }).catch(() => {});
  ok(await page.locator('.cutscene.story').count() === 1 && (await page.locator('.story-name').textContent()).includes('DREAMHOUSE'), `${name}: World 1 story card`);
  await page.locator('.cutscene .btn').click();
  ok((await page.textContent('.scene-banner-title')).includes('Grandma Rockie'), `${name}: Grandma Rockie visits`);
  ok(await page.locator('.screen.look-w1').count() === 1, `${name}: the screen wears the Dreamhouse look`);
  await zapTips(page);
  await page.locator('.btn', { hasText: '+10 max HP' }).click();
  ok(await page.locator('.map-screen').count() === 1, `${name}: the map`);
  ok(await page.locator('.map-spot.spot-arena').count() === 1, `${name}: one Arena on the map`);
  ok(await page.locator('.spot-fee').first().textContent().then((t) => t.includes('25')), `${name}: the Arena shows its fee`);
  if (name === 'chromium') await shot(page, 'map-w1');
  await zapTips(page);
  await page.locator('.map-node.reachable').first().click();
  ok(await page.locator('.combat').count() === 1, `${name}: a fight starts`);
  ok(await page.locator('.hero-meter.meter-aaron').count() === 1, `${name}: the Big Hammer meter shows`);
  ok(await page.locator('.hand .card .cnm', { hasText: /^Big Hammer$/ }).count() === 1, `${name}: the Big Hammer is in the opening hand`);
  if (name === 'chromium') await shot(page, 'combat-w1');
  // play by taps until the fight ends
  for (let turn = 0; turn < 30; turn++) {
    await zapTips(page);
    if (await page.locator('.combat').count() === 0) break;
    for (let k = 0; k < 8; k++) {
      const playable = page.locator('.hand .card:not(.unaffordable)');
      if (await playable.count() === 0) break;
      await playable.first().click();
      if (await page.locator('.enemy.targetable').count()) await page.locator('.enemy.targetable').first().click();
      await page.waitForTimeout(80);
      if (await page.locator('.combat').count() === 0) break;
    }
    if (await page.locator('.combat').count() === 0) break;
    if (await rl4(page, () => window.__RL4.combat && window.__RL4.combat.over)) { await page.waitForTimeout(400); continue; }
    await page.locator('.endturn').click();
    await page.waitForFunction(() => !window.__RL4.combat || window.__RL4.combat.phase === 'hero' || window.__RL4.combat.over, null, { timeout: 8000 }).catch(() => {});
  }
  await page.waitForSelector('.victory-beat, .screen h2', { timeout: 8000 }).catch(() => {});
  const won = await page.locator('.victory-beat').count() === 1;
  await okShot(page, won, `${name}: won the first fight by taps`);
  if (won) {
    ok(await page.locator('.coin-tally').textContent().then((t) => t.includes('Fight win')), `${name}: the coin tally shows the fight coins`);
    await page.locator('.btn', { hasText: 'Keep going' }).click();
    await page.waitForTimeout(200);
    if (await page.locator('.treasure-pop').count()) await page.locator('.treasure-pop .btn').first().click();
    ok(await page.locator('.reward-row .mini-card').count() >= 3, `${name}: card reward offers 3+`);
    await page.locator('.reward-row .mini-card').first().click();
    ok(await page.locator('.map-screen').count() === 1, `${name}: back to the map`);
    // save persists across reload
    await page.reload({ waitUntil: 'load' });
    ok(await page.locator('.btn', { hasText: 'Continue' }).count() === 1, `${name}: Continue appears after reload`);
    await page.locator('.btn', { hasText: 'Continue' }).click();
    ok(await page.locator('.map-screen').count() === 1, `${name}: the saved run resumes on the map`);
  }
  ok(page._errors.length === 0, `${name}: no page errors (${page._errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}

// ---------------------------------------------------------------- mechanics, via dev jumps
async function mechanicsSuite(browserType, name) {
  const browser = await browserType.launch({ timeout: 30000 });
  const page = await newPage(browser);
  await page.goto(BASE, { waitUntil: 'load' });
  // W3: Tea Party Rules banner + orange glow + Sass + Say Sorry
  await rl4(page, () => { window.__RL4.dev.start('aaron', 91, 3); window.__RL4.dev.fight(['spoon_knight', 'rude_scone'], 'fight', 'take_turns'); });
  // the opening hand is shuffled: make sure a Punch is in it (~4% of shuffles have none)
  await rl4(page, () => { const st = window.__RL4.combat; if (!st.hand.some((c) => c.id === 'punch')) { const i = st.draw.findIndex((c) => c.id === 'punch'); st.hand.push(st.draw.splice(i, 1)[0]); window.__RL4.dev.refresh(); } });
  await zapTips(page);
  ok(await page.locator('.rule-banner').textContent().then((t) => t.includes('Take Turns')), `${name}: the rule banner shows the rule`);
  ok(await page.locator('.screen.look-w3').count() === 1, `${name}: the Tea Party look`);
  await page.locator('.hand .card', { hasText: 'Punch' }).first().click();
  await page.locator('.enemy.targetable').first().click();
  await page.waitForTimeout(150);
  ok(await page.locator('.card.breaks-rule .cnm', { hasText: /^Big Hammer$/ }).count() === 1, `${name}: a rule-breaking card glows orange BEFORE it's played`);
  await rl4(page, () => { const st = window.__RL4.combat; window.__RL4.C.addSass(st); const s = st.draw.find((c) => c.id === 'sass'); st.draw.splice(st.draw.indexOf(s), 1); st.hand.push(s); st.hero.energy = 2; window.__RL4.dev.refresh(); });
  await zapTips(page);
  ok(await page.locator('.hand .card', { hasText: 'Sass' }).count() === 1, `${name}: a Sass card in hand`);
  await page.locator('.hand .card', { hasText: 'Sass' }).click();
  ok(await rl4(page, () => window.__RL4.C.sassCount(window.__RL4.combat)) === 0, `${name}: Say Sorry tosses the Sass`);
  if (name === 'chromium') await shot(page, 'combat-w3-rules');
  // Delilah: announcement + TANTRUM
  await rl4(page, () => { window.__RL4.dev.fight(['delilah'], 'boss', 'inside_voices'); const st = window.__RL4.combat; st.hero.hp = st.hero.maxHp = 999; window.__RL4.C.endTurn(st); window.__RL4.dev.refresh(); });
  await zapTips(page);
  ok(await page.locator('.rule-next').count() === 1, `${name}: Delilah's next rule is announced a turn early`);
  await rl4(page, () => { const st = window.__RL4.combat; const d = st.enemies[0]; d.shield = 0; window.__RL4.C.dealDamage(st, d, 9999, { attacker: st.hero }); window.__RL4.dev.refresh(); });
  ok(await rl4(page, () => window.__RL4.combat.enemies[0].state.phase) === 2, `${name}: Delilah's TANTRUM phase`);
  ok(await page.locator('.rule-banner').count() === 0, `${name}: TANTRUM turns the rules off`);
  // the cousins' secret: tap her portrait 3 times on her intro → a wink, a secret line, +10 coins, once
  await rl4(page, () => { window.__RL4.dev.start('wyatt', 31, 1); window.__RL4.dev.screen('boss'); });
  await zapTips(page);
  const coins0 = await rl4(page, () => window.__RL4.run.coins);
  for (let i = 0; i < 3; i++) await page.locator('.boss-intro-face').click();
  ok(await rl4(page, () => window.__RL4.run.coins) === coins0 + 10 && await page.locator('.boss-intro-face.wink').count() === 1, `${name}: Stella's secret wink pays 10 coins`);
  ok((await page.textContent('.boss-intro .speaker-line')).includes('Queen likes you'), `${name}: the secret line replaces her intro line`);
  ok(await page.locator('audio[data-track="boss_stella"]').count() === 1, `${name}: Stella's own theme plays on her intro`);
  for (let i = 0; i < 3; i++) await page.locator('.boss-intro-face').click();
  ok(await rl4(page, () => window.__RL4.run.coins) === coins0 + 10, `${name}: the secret pays once per run`);
  // W2: squishy chip + Squeeze Out before Lucy
  await rl4(page, () => { window.__RL4.dev.start('wyatt', 12, 2); window.__RL4.dev.fight(['cube_needoh'], 'fight'); });
  await zapTips(page);
  ok(await page.locator('.chip[data-status="squishy"]').count() === 1, `${name}: the squish meter chip shows`);
  ok(await page.locator('.hero-meter.meter-wyatt .pip').count() === 6, `${name}: Wyatt's Momentum meter`);
  if (name === 'chromium') await shot(page, 'combat-w2');
  await rl4(page, () => { const r = window.__RL4.run; const bossId = 'boss'; r.pos = Object.keys(r.map.nodes).find((id) => r.map.nodes[id].f === 10); });
  await rl4(page, () => { const res = window.__RL4.R.enterMapNode(window.__RL4.run, 'boss'); window.__RL4._res = res; });
  // enterNode isn't exported; use the dev path: squeeze → boss intro happens inside enterNode
  await rl4(page, () => window.__RL4.dev.squeeze());
  ok(await page.locator('.cutscene.squeeze').count() === 1, `${name}: the Squeeze Out scene`);
  await page.locator('.cutscene-skip').click();
  // Arena
  await rl4(page, () => window.__RL4.dev.arena());
  ok(await page.locator('.arena-wave').count() === 3, `${name}: the Arena shows its 3 waves`);
  await page.locator('.btn', { hasText: 'Pay' }).click();
  ok(await rl4(page, () => window.__RL4.combat && window.__RL4.combat.waves.length) === 2, `${name}: Arena wave 1 of 3`);
  await rl4(page, () => { for (let w = 0; w < 3; w++) { const st = window.__RL4.combat; for (const e of window.__RL4.C.livingEnemies(st)) window.__RL4.C.dealDamage(st, e, 9999, { attacker: st.hero }); } window.__RL4.dev.refresh(); });
  await page.waitForSelector('.victory-beat', { timeout: 8000 }).catch(() => {});
  ok((await page.textContent('h2')).includes('ARENA'), `${name}: Arena champion beat`);
  await page.locator('.btn', { hasText: 'Keep going' }).click();
  ok(await page.locator('.btn', { hasText: 'SUPER money pet' }).count() === 1, `${name}: pick-your-prize`);
  await page.locator('.btn', { hasText: 'SUPER money pet' }).click();
  ok(await page.locator('.treasure-pop', { hasText: 'SUPER' }).count() === 1, `${name}: the SUPER pet pops`);
  // shop: buy a sticker and stick it
  await rl4(page, () => { document.querySelectorAll('.modal-veil').forEach((m) => m.remove()); window.__RL4.run.coins = 300; window.__RL4.dev.shop(); });
  await zapTips(page);
  const stickerBtn = page.locator('.scene-body .btn', { hasText: 'Sticker' }).first();
  await stickerBtn.click();
  await page.locator('.modal .mini-card').first().click();
  ok(await rl4(page, () => window.__RL4.run.deck.some((c) => c.sticker)), `${name}: a bought sticker is on a card`);
  if (name === 'chromium') await shot(page, 'shop-w2');
  // Save Code: copy on one tablet, paste on another
  await rl4(page, () => { document.querySelectorAll('.modal-veil').forEach((m) => m.remove()); window.__RL4.dev.start('liam', 77, 2); });
  await rl4(page, () => window.__RL4.showTitle());
  await page.locator('.btn', { hasText: 'Settings' }).click();
  await page.locator('.btn', { hasText: 'Save Code' }).click();
  const code = await page.locator('textarea.save-code').first().inputValue();
  ok(code.length > 100, `${name}: a Save Code is produced`);
  await rl4(page, () => { localStorage.clear(); document.querySelectorAll('.modal-veil').forEach((m) => m.remove()); window.__RL4.showTitle(); });
  await page.locator('.btn', { hasText: 'Settings' }).click();
  await page.locator('.btn', { hasText: 'Save Code' }).click();
  await page.locator('textarea.save-code').nth(1).fill(code);
  await page.locator('.btn', { hasText: 'Load that code' }).click();
  ok(await page.locator('.btn', { hasText: 'Continue — Liam' }).count() === 1, `${name}: the Save Code restores the run on another device`);
  // an interrupted boss fight restarts on Continue (no skip, no soft-lock)
  await rl4(page, () => { document.querySelectorAll('.modal-veil').forEach((m) => m.remove()); window.__RL4.dev.start('aaron', 5, 1); const r = window.__RL4.run; r.pos = Object.keys(r.map.nodes).find((id) => r.map.nodes[id].f === 10); window.__RL4.R.enterMapNode(r, 'boss'); window.__RL4.dev.fight(['stella'], 'boss'); });
  await page.reload({ waitUntil: 'load' });
  await page.locator('.btn', { hasText: 'Continue' }).click();
  ok(await page.locator('.boss-intro').count() === 1 || await page.locator('.combat').count() === 1, `${name}: reload mid-boss → Continue restarts the boss fight`);
  // review #1: reload on the boss splash → Continue returns to it, then on to World 2
  await rl4(page, () => { document.querySelectorAll('.modal-veil,.cutscene').forEach((m) => m.remove()); window.__RL4.dev.start('wyatt', 8, 1); window.__RL4.dev.fight(['stella'], 'boss'); window.__RL4.dev.win(); });
  await page.waitForSelector('.boss-splash', { timeout: 8000 }).catch(() => {});
  await page.reload({ waitUntil: 'load' });
  await page.locator('.btn', { hasText: 'Continue' }).click();
  ok(await page.locator('.boss-splash').count() === 1, `${name}: #1 reload on the boss splash → Continue returns to it`);
  await page.locator('.boss-splash .btn.gold').click();
  await page.locator('.modal .btn.gold').first().click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 3 && await page.locator('.modal .btn', { hasText: 'Save it for later' }).count(); i++) await page.locator('.modal .btn', { hasText: 'Save it for later' }).click();
  ok(await rl4(page, () => window.__RL4.run.world === 2 && !window.__RL4.run.after), `${name}: #1 the boss treasure → World 2, after-state cleared`);
  // review #2: backing out of a sticker target never re-opens the Arena prize
  await rl4(page, () => { document.querySelectorAll('.modal-veil,.cutscene').forEach((m) => m.remove()); window.__RL4.dev.start('aaron', 9, 1); window.__RL4.run.coins = 999; window.__RL4.dev.arena(); });
  await page.locator('.btn', { hasText: 'Pay' }).click();
  await rl4(page, () => { for (let w = 0; w < 3; w++) { const st = window.__RL4.combat; for (const e of window.__RL4.C.livingEnemies(st)) window.__RL4.C.dealDamage(st, e, 9999, { attacker: st.hero }); } window.__RL4.dev.refresh(); });
  await page.waitForSelector('.victory-beat', { timeout: 8000 }).catch(() => {});
  await page.locator('.btn', { hasText: 'Keep going' }).click();
  const deck0 = await rl4(page, () => window.__RL4.run.deck.length);
  await page.locator('.btn', { hasText: 'rare card' }).click();
  await page.locator('.modal .mini-card').first().click();
  await page.locator('.modal .btn:not([disabled])', { hasText: 'Star Sticker' }).click();
  await page.locator('.modal .btn', { hasText: 'Back' }).click();
  ok(await page.locator('.modal h2', { hasText: 'Free sticker' }).count() === 1, `${name}: #2 Back returns to the sticker menu`);
  await page.locator('.modal .btn', { hasText: 'Save it for later' }).click();
  ok(await page.locator('.btn', { hasText: 'rare card' }).count() === 0, `${name}: #2 the Arena prize can't be claimed twice`);
  ok(await rl4(page, () => window.__RL4.run.deck.length) === deck0 + 1, `${name}: #2 exactly one rare card was added`);
  // Astra #3: a full pouch + the Arena's SUPER pet survives a reload (the swap is offered again)
  await rl4(page, () => { document.querySelectorAll('.modal-veil,.cutscene').forEach((m) => m.remove()); window.__RL4.dev.start('aaron', 13, 1); const r = window.__RL4.run; r.pets = [{ id: 'pink_poodle', fights: 0 }, { id: 'pony_pal', fights: 0 }, { id: 'glitter_kitten', fights: 0 }]; r.coins = 999; window.__RL4.dev.arena(); });
  await page.locator('.btn', { hasText: 'Pay' }).click();
  await rl4(page, () => { for (let w = 0; w < 3; w++) { const st = window.__RL4.combat; for (const e of window.__RL4.C.livingEnemies(st)) window.__RL4.C.dealDamage(st, e, 9999, { attacker: st.hero }); } window.__RL4.dev.refresh(); });
  await page.waitForSelector('.victory-beat', { timeout: 8000 }).catch(() => {});
  await page.locator('.btn', { hasText: 'Keep going' }).click();
  await page.locator('.btn', { hasText: 'SUPER money pet' }).click();
  ok(await page.locator('.treasure-pop .btn', { hasText: 'home' }).count() >= 1, `${name}: Astra #3 full pouch → the swap is offered`);
  await page.reload({ waitUntil: 'load' });
  await page.locator('.btn', { hasText: 'Continue' }).click();
  ok(await page.locator('.treasure-pop .btn', { hasText: 'home' }).count() >= 1, `${name}: Astra #3 after a reload the SUPER pet swap is offered again (not lost)`);
  await page.locator('.treasure-pop .btn', { hasText: 'home' }).first().click();
  ok(await rl4(page, () => window.__RL4.run.pets.length === 3 && window.__RL4.run.pets.some((p) => !['pink_poodle', 'pony_pal', 'glitter_kitten'].includes(p.id))), `${name}: Astra #3 the SUPER pet joined`);
  // Astra #2: the World 3 visitor counts as given the moment its boss treasure is picked
  await rl4(page, () => { document.querySelectorAll('.modal-veil,.cutscene').forEach((m) => m.remove()); window.__RL4.dev.start('wyatt', 21, 3); window.__RL4.dev.visitor(); });
  await zapTips(page);
  await page.locator('.btn', { hasText: 'boss treasure' }).click();
  await page.locator('.modal .btn.gold').first().click();
  ok(await rl4(page, () => JSON.parse(localStorage.getItem('rl4_run') || '{}').visitorDone === true), `${name}: Astra #2 the visitor is saved as done once the boss treasure is picked`);
  ok(page._errors.length === 0, `${name}: mechanics — no page errors (${page._errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}

// ---------------------------------------------------------------- a whole run, fast-forwarded in-page
async function fullRun(browserType, name) {
  const browser = await browserType.launch({ timeout: 30000 });
  const page = await newPage(browser);
  await page.goto(BASE, { waitUntil: 'load' });
  await rl4(page, () => window.__RL4.dev.start('liam', 2026, 1));
  const looks = [];
  for (let step = 0; step < 400; step++) {
    const state = await rl4(page, () => {
      const scr = document.querySelector('.screen');
      return { screen: scr ? scr.className : '', cut: !!document.querySelector('.cutscene'), modal: !!document.querySelector('.modal-veil'), combat: !!window.__RL4.combat, crown: !!document.querySelector('.crown-screen'), credits: !!document.querySelector('.credits'), world: window.__RL4.run && window.__RL4.run.world };
    });
    if (state.crown) break;
    if (state.world && !looks.includes(state.world)) looks.push(state.world);
    if (state.credits) { await page.locator('.credits-skip').click().catch(() => {}); await page.locator('.credits-continue').click().catch(() => {}); continue; }
    if (state.cut) {
      const skip = page.locator('.cutscene-skip');
      if (await skip.count()) { await skip.first().click().catch(() => {}); } else { await page.locator('.cutscene .btn').first().click().catch(() => {}); }
      await page.waitForTimeout(120);
      continue;
    }
    if (state.modal) {
      const btn = page.locator('.modal .btn:not([disabled])').first();
      if (await btn.count()) { await btn.click().catch(() => {}); } else { await page.locator('.modal .mini-card').first().click().catch(() => {}); }
      await page.waitForTimeout(80);
      continue;
    }
    if (state.combat) { await rl4(page, () => window.__RL4.dev.win()); await page.waitForTimeout(150); continue; }
    if (state.screen.includes('map-screen')) {
      await rl4(page, () => { const n = document.querySelector('.map-node.reachable:not(.spot-arena)') || document.querySelector('.map-node.reachable'); n.click(); });
      continue;
    }
    if (state.screen.includes('victory-beat') || state.screen.includes('boss-splash') || state.screen.includes('boss-intro')) {
      await page.locator('.screen .btn.gold').first().click().catch(() => {});
      continue;
    }
    // shop / rest / treasure / reward / visitor / arena: take the first sensible exit
    const exits = ['All done', 'Rest', 'Open it', 'Skip', 'walk past', '+10 max HP', 'Heal all the way', 'Upgrade 3', 'A SUPER money pet'];
    let clicked = false;
    for (const t of exits) {
      const b = page.locator('.screen .btn:not([disabled])', { hasText: t }).first();
      if (await b.count()) { await b.click().catch(() => {}); clicked = true; break; }
    }
    if (!clicked) {
      const any = page.locator('.screen .btn:not([disabled])').first();
      if (await any.count()) await any.click().catch(() => {}); else await page.waitForTimeout(100);
    }
  }
  await okShot(page, await page.locator('.crown-screen').count() === 1, `${name}: a full run reaches the crown screen (worlds seen: ${looks.join(',')})`);
  ok(looks.join(',') === '1,2,3', `${name}: the run visited all three worlds`);
  ok(await rl4(page, () => JSON.parse(localStorage.getItem('rl4_profile')).wins.liam === 1), `${name}: the win is recorded`);
  ok(await rl4(page, () => JSON.parse(localStorage.getItem('rl4_profile')).sassMax === 1), `${name}: Sass Level 1 unlocks`);
  if (name === 'chromium') await shot(page, 'crown');
  ok(page._errors.length === 0, `${name}: full run — no page errors (${page._errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}

// ---------------------------------------------------------------- the ending, offline boot, sw
async function endingAndOffline(browserType, name) {
  const browser = await browserType.launch({ timeout: 30000 });
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!String(e).includes('due to access control checks')) errors.push(String(e)); });
  await page.goto(BASE, { waitUntil: 'load' });
  await rl4(page, () => window.__RL4.dev.ending('aaron'));
  await okShot(page, await page.locator('.cutscene.ending').count() === 1, `${name}: the ending cutscene`);
  ok(await page.locator('.ending-cap').textContent().then((t) => t.includes('window')), `${name}: shot 1 — Delilah and the window`);
  await page.locator('.cutscene.ending').click();
  ok(await page.locator('.ending-cap').textContent().then((t) => t.includes('AARON')), `${name}: shot 2 — Aaron leaps after her`);
  if (name === 'chromium') await shot(page, 'ending');
  await page.locator('.cutscene-skip').click();
  // the music-video ending (Movies → The Song): plays, or falls back to the credits; skippable
  if (existsSync(join(ROOT, 'assets', 'video', 'ending.mp4'))) {
    await rl4(page, () => { localStorage.setItem('rl4_profile', JSON.stringify({ wins: { aaron: 1 }, sassMax: 1, movies: { ending: 1, song: 1 } })); document.querySelectorAll('.cutscene,.credits').forEach((c) => c.remove()); window.__RL4.showTitle(); });
    await page.locator('.btn', { hasText: 'Movies' }).click();
    await page.locator('.modal .btn', { hasText: 'The Song' }).click();
    const how = await page.waitForFunction(() => {
      if (document.querySelector('.credits')) return 'credits';
      const v = document.querySelector('.video-ending video');
      return v && (v.readyState >= 2 || document.querySelector('.cutscene-go')) ? 'video' : false;
    }, null, { timeout: 12000 }).then((h) => h.jsonValue(), () => 'hung');
    ok(how !== 'hung', `${name}: the song plays as the video or falls back to the credits (${how})`);
    if (name.startsWith('webkit')) ok(how === 'video', `${name}: Safari's engine decodes the ending video`);
    await page.locator('.cutscene-skip, .credits-skip').first().click().catch(() => {});
    await page.locator('.credits-continue').click({ timeout: 2000 }).catch(() => {});
    await page.waitForSelector('.title-logo', { timeout: 5000 }).catch(() => {});
    ok(await page.locator('.title-logo').count() === 1, `${name}: skipping the song returns to the title`);
  }
  // offline: the shell boots from the service worker cache
  const claimed = await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).then(() => true, () => false);
  if (!claimed) { await page.reload({ waitUntil: 'load' }); }
  const claimed2 = claimed || await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).then(() => true, () => false);
  ok(claimed2, `${name}: the service worker controls the page`);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  ok(await page.locator('.title-logo').count() === 1, `${name}: boots offline`);
  if (existsSync(join(ROOT, 'assets', 'video', 'ending.mp4'))) {
    // offline, the song never hangs on the (unprecached) video: it plays from what the browser
    // already holds, or the karaoke credits take over
    await page.locator('.btn', { hasText: 'Movies' }).click().catch(() => {});
    await page.locator('.modal .btn', { hasText: 'The Song' }).click().catch(() => {});
    const how = await page.waitForFunction(() => {
      if (document.querySelector('.credits')) return 'credits';
      const v = document.querySelector('.video-ending video');
      return v && !v.paused && v.currentTime > 0.5 ? 'video (browser cache)' : false;
    }, null, { timeout: 12000 }).then((h) => h.jsonValue(), () => 'hung');
    ok(how !== 'hung', `${name}: offline, the song never hangs (${how})`);
    await page.locator('.cutscene-skip, .credits-skip').first().click().catch(() => {});
  }
  await context.setOffline(false);
  // shared-origin cache hygiene: siblings survive RL4's activate
  const keys = await page.evaluate(() => caches.keys());
  ok(keys.some((k) => /^rolfe-legends-4-v\d+$/.test(k)), `${name}: RL4's cache exists`);
  ok(errors.length === 0, `${name}: ending/offline — no page errors (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}
async function swSiblingCaches(browserType, name) {
  const browser = await browserType.launch({ timeout: 30000 });
  const page = await browser.newPage();
  const SIBLINGS = ['rolfe-legends-v3', 'rolfe-legends-2-v35', 'rolfe-legends-3-v3'];
  const OWN_OLD = 'rolfe-legends-4-v0';
  await page.goto(BASE + '/manifest.json', { waitUntil: 'load' });
  await page.evaluate(async (names) => { for (const n of names) await (await caches.open(n)).put('/probe-' + n, new Response(n)); }, [...SIBLINGS, OWN_OLD]);
  await page.goto(BASE, { waitUntil: 'load' });
  const claimed = await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).then(() => true, () => false);
  ok(claimed, `${name}: sw activates and claims`);
  const keys = await page.evaluate(() => caches.keys());
  for (const s of SIBLINGS) ok(keys.includes(s), `${name}: sibling cache ${s} survives RL4's activate`);
  ok(!keys.includes(OWN_OLD), `${name}: RL4's own stale cache is cleaned`);
  await browser.close();
}

try {
  for (const [bt, nm] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
    await uiSuite(bt, nm);
    await mechanicsSuite(bt, `${nm}-mech`);
    await fullRun(bt, `${nm}-full`);
    await endingAndOffline(bt, `${nm}-end`);
    await swSiblingCaches(bt, `${nm}-sw`);
  }
} catch (e) {
  ok(false, 'suite crashed: ' + (e && e.message));
}
if (ownServer) ownServer.close();
const pass = results.filter(([c]) => c).length;
console.log(`\ne2e: ${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
