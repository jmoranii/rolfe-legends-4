# Rolfe Legends 4: Attack of the Cousins

The fourth Rolfe Legends game, and the second one **co-designed with the boys**. Wyatt (10) and Aaron (8) pitched it live with James on Sun 2026-09-27: their cousins Stella, Lucy, and Delilah as the bosses, a Barbie Dreamhouse, a world inside a squishy toy, a sassy tea party, a money-pet economy, and an ending where Delilah jumps out the window onto the farm. RL1 and RL2 were gifts built *for* them; RL3 and RL4 are built *with* them. **Their ideas are requirements, not suggestions.**

Read `DESIGN.md` (the design, with numbers) and `GOAL.md` (the build plan and acceptance criteria). DESIGN.md wins on any conflict with this file's summaries; this file's content rules win over everything.

## The one-sentence vision

Three heroes fight their way through three cousin-themed worlds in one long run with one deck, earning money pets, dressing up their cards with stickers, and watching every card, enemy, and portrait transform into each world's style — until the littlest, sassiest cousin is beaten and jumps out the window.

## Pillars (check every decision against these)

1. **The boys' ideas are load-bearing.** Every kid-credited idea in DESIGN.md ships as designed unless James says otherwise. When implementation forces a change, log it in REVIEW.md with the kid's original quoted.
2. **Not a reskin.** RL2's *engine* is the chassis (`~/code/rolfe-legends-2`: combat, run layer, map, rng, harness, music, credits, farm code, sw, prefetch, e2e rig). RL2's and RL3's *content* is never reused as-is: no card, enemy, relic, event, status, or treasure carried over. A test enforces the names; the design review enforces the mechanics.
3. **Kid-fair, not kid-easy.** Exact intents on screen, rules visible before they matter, nothing changes mid-turn, no feel-bad cancels, no unwinnable spirals. ~25% first-run winrate per hero (Wyatt asked for hard).
4. **Every world is a new place.** Look, sound, challenge, enemies, rooms, and Arena all change per world. The world-jump transformation is a headline feature, not decoration.
5. **RL3-final is the polish FLOOR.** GOAL.md §Polish floor is acceptance criteria for the first pass.
6. **Durable + frictionless.** Vanilla HTML/CSS/JS, no build step, no server, localStorage (`rl4_*` keys) + Farm Code saves, offline PWA, hosted at `jmoranii.github.io/rolfe-legends-4/` (the parental-controls-approved origin).
7. **Tested, not hoped.** Unit tests + selfplay harness + dual-engine e2e green before every commit. The harness must genuinely model every new mechanic (Momentum, Big Hammer, Potty meter, Squishy, Tea Party Rules, Sass, Nuh-Uh Shield, pets, Arena, stickers) or its numbers are fiction.

## Hard content rules

- **First names and family nicknames only.** No surnames, birthdates, or real place names beyond "the farm." Grandparents are **Grampa Flaj** and **Grandma Rockie** (Wyatt's names). Aunt **Savanah** (one n — confirmed by James).
- **The cousins are affectionate comedy.** Stella (Queen of Barbies), Lucy (Ruler of Squishies), and Delilah (the Sassafras) are fabulous, squishy, and sassy, never mean, bad, or scary. A beaten cousin is *outplayed*, never hurt: no injury framing, no "defeated" gore language (RL3's duck rule).
- **"Sassafras" means sassy** — not the tree, not root beer (James's correction).
- **Liam the Potty Trained:** potty humor stays light (bubbles, sparkles, "FLUSH!"). No gross-out, ever.
- **Never a curse or status named "Chores."** Chores are never framed as bad (household norm, series canon).
- **Name-brand toys are OK** (James: "just for friends and family") — Barbie, Dreamhouse, NeeDoh. This overrides RL3's no-trademark rule for this game only. Don't copy real logos or packaging art.
- **Public posture same as RL1/RL3** (James): the family's first names and painted likenesses may appear in the public repo and on Pages. **Reference photos are gitignored and never committed.**
- Family cameo dialogue, cousin lines, and all lyrics are drafted, shipped, and listed in REVIEW.md for James's pass.
- Any secret content stays **zero-hint** (the RL2 white-dot lesson). Whether RL4 has a secret is James's call; none is specified yet — do not invent one.

## Cast

- **Heroes:** Wyatt the Speedy (Momentum) · Aaron the Strong (the Big Hammer) · **Liam the Potty Trained** (the Potty meter; Liam the Little from RL2, now potty trained — Wyatt's rename).
- **Cousin bosses, oldest to youngest:** Stella, Queen of Barbies (World 1) · Lucy, Ruler of Squishies (World 2) · Delilah the Sassafras (World 3, final boss). They are Aunt Savanah's daughters.
- **Family visitors:** Grandma Rockie (W1) · Grampa Flaj (W2) · Mom and Dad (W3).
- **The ending cast:** the three cousins, the winning hero, Goldie the guard llama in her fence, Aunt Savanah in a shiny gray car.

## Reference photos (gitignored)

`assets/ref-photos/`: `stella.jpg`, `lucy.jpg`, `delilah.jpg` (cropped from group shots; originals alongside), `liam.png` (recent, potty-trained era), `savannah.jpg` + `savannah-family.jpg` (Savanah, and the whole family with the three girls — useful for the ending). Returning characters: `~/code/rolfe-legends-2/assets/ref-photos/` (wyatt, aaron, tory = Mom, jacob = Dad, sean = Grampa Flaj, kim = Grandma Rockie, llama = Goldie, liam-recent-*). Stella's and Lucy's crops are low-resolution (~200 px faces): fine for likeness; note it in the Gaps report.

## Conventions

- Stack: HTML5 + CSS3 + vanilla JS ES modules, zero dependencies, no build.
- Pure logic (no DOM): `js/combat.js`, `js/run.js`, `js/economy.js`, `js/rng.js`, `js/rules.js` (Tea Party Rules) · data: `js/cards.js`, `js/enemies.js`, `js/pets.js`, `js/treasures.js`, `js/stickers.js`, `js/worlds.js` · render: `js/game.js` + `js/skins.js` (world look switching).
- Every card and enemy names its inspiration in a code comment (StS1/StS2/Balatro/original).
- Tests: `node test/test.mjs` + `node test/selfplay.mjs <n>` (n numeric > 0; the harness refuses vacuous runs) + Playwright e2e in Chromium AND WebKit. **Pin playwright 1.60.0** (this Mac's frozen WebKit hangs on newer).
- Service worker: `CACHE = 'rolfe-legends-4-vN'`; activate deletes only caches matching this game's own pattern (the shared-origin fix shipped Sun 2026-09-27 in RL1–3 — copy that sw.js pattern **and its unit test**, and rename CACHE).
- Art: `gpt-image` CLI, **codex backend** (James's ChatGPT subscription; the api backend has no key on this Mac — confirmed Sun 2026-09-27, and James approved family likenesses on this lane). Emoji fallback always; PNGs drop in with no code changes.
- Music: `suno-auto` only (never bare `suno generate`), take 1 kept, `.lrc` word timings for songs with lyrics, silence fallback.
- Seeded RNG everywhere in logic; reproducible runs.

## Privacy & publishing

Local git only. Never push to any remote, never deploy — publish is James's call (series precedent). Reference photos never leave `assets/ref-photos/`.
