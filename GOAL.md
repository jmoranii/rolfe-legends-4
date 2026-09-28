# GOAL: Build Rolfe Legends 4: Attack of the Cousins — the whole game, autonomously

> **STATUS: LIVE** (Sun 2026-09-27). James's call: **one autonomous pass, the entire game** — no Act-1-then-playtest stop. Build all three worlds, the art, the music, the cutscenes, and the ending to shippable quality. Publishing is still James's (Phase 8).

You are working in `~/code/rolfe-legends-4`. Read `CLAUDE.md` (constitution + content rules) and `DESIGN.md` (the design with numbers, including the review fixes) first; they override this file on conflict. Your goal: phases 0–7 below, to the Definition of done. **Never push to a remote or deploy anywhere.**

## What's different from RL3's goal run

1. **No mid-build playtest.** James skipped the Act-1 playtest gate. The harness and the Polish floor are the only stand-ins for the boys, so both must be stricter: every kid-fairness rule in DESIGN.md §1 and §10 is an automated check, not a judgment.
2. **Everything visible is new.** RL2 is the engine; its content is not. Port the engine, strip the content, and add a **no-port test**: no card, enemy, relic/treasure, event, or status name in RL4 may match one in `~/code/rolfe-legends-2/js/*.js` or `~/code/rolfe-legends-3/js/*.js`.
3. **World skins are core engineering, not an art afterthought.** Every card, hero portrait, pet, frame, board, map, and UI accent switches look per world, and the deck visibly transforms at each world-jump.
4. **One run, one deck** (RL2 structure) — not RL3's farm hub. The only persistence across runs is: unlocked Sass Levels, a Movies menu of seen cutscenes, and settings.

## Non-negotiable ground rules

1. **Green before every commit:** `node test/test.mjs` + `node test/selfplay.mjs 150` + e2e (Chromium and WebKit). Never commit red. Granular commits, clear messages.
2. **Content rules in CLAUDE.md hold absolutely.**
3. **Anything needing James's judgment → REVIEW.md**, then keep going: cousin/family lines, lyrics, art you're unsure of, any design deviation (quote the kid's original), anything cut. Best call now, log it — never block.
4. **Keep PROGRESS.md current every commit:** phase, done, next, harness numbers, rubric grades.
5. **Harness fidelity is a rail:** a mechanic's balance numbers don't count until the bot genuinely plays it. The harness refuses non-numeric or zero run counts.
6. **Art runs on the codex backend** (James's ChatGPT subscription, $0 marginal; James approved family-photo likenesses on it Sun 2026-09-27). It burns plan limits 3–5× faster and takes ~1–2 min per image: run 3 lanes in parallel (RL3 pattern), wrap each call in `perl -e 'alarm 420; exec @ARGV'` (stalls happen), and on **exit 4 (usage window exhausted) pause art, keep building other phases, and resume when the window resets** — never switch backends. Codex may return non-requested sizes: normalize every image (crop/resize) in the optimize pass. Likeness-critical art first (hero portraits, cousins, Savanah, ending), card skins last, so a limit wall never leaves the faces unfinished.

## Phase 0 — Chassis port

Fresh git history is already started (DESIGN.md, CLAUDE.md, GOAL.md committed). Port from RL2: engine, run layer, map generator, rng, save + Farm Code, music/prefetch/credits modules, sw.js (**the fixed shared-origin version + its unit test**, CACHE renamed `rolfe-legends-4-v1`), e2e rig with the 1.60.0 pin, selfplay harness skeleton. Strip all RL2 content. Add the no-port test. Everything green and empty before content lands.

## Phase 1 — Combat core + heroes

- The four effects (Pumped, Wobbly, Wide Open, Slimed) and the world traits (Squishy meter, Tea Party Rules + Sass, Nuh-Uh Shield), each with a tap-to-explain chip and a one-time teaching pop-up.
- The three hero mechanics, always on screen: Momentum speedometer, Big Hammer card (starts every fight in hand; shows its current damage live), Potty meter with the FLUSH! moment.
- All three starter decks, starter treasures, and 15-card reward pools exactly as DESIGN.md §3, with upgrades (+ = bigger numbers only).
- **Guard tests:** no infinite turn exists (search-based test: from a set of adversarial hands/stickers/treasures, a single turn terminates within N plays) · the Big Hammer can't be stolen/Slimed/cancelled · Sass is fight-only and capped at 3 · rules never change mid-turn.

## Phase 2 — The run + Aaron's economy

- 3 worlds × (visitor scene → 10-floor branching map → boss), post-boss 25% heal + Boss Treasure pick; auto-save every node; `rl4_*` keys.
- Coins, money pets (3 slots, tiers, growth cap), Arena nodes (fees 25/40/60, 3 waves, pick-one prize, can't-afford walk-past, one visit), shops (cards / stickers / removal), stickers (one per card, the guards in DESIGN.md §5), treasures + boss treasures, family visitors.
- Teaching order exactly as DESIGN.md §7.

## Phase 3 — Worlds, enemies, bosses, ending

- All three bestiaries, elites, Arenas, and cousin bosses per DESIGN.md §6 (the harness tunes numbers; patterns and identities stay).
- Stella's shown-next outfit cycle · Lucy's Mega Squish phase · Delilah's announced-a-turn-early rules, Nuh-Uh Shield, and TANTRUM phase 2.
- **World skins system (`js/skins.js`):** CSS world themes (frames, boards, fonts, palettes, map styling, UI accents) + per-world art lookup with fallback to base art → emoji. The deck browser, rewards, shop, and every card surface honor the current world.
- **World-jump scenes (in-engine):** farm → Dreamhouse, Dreamhouse → inside the Squishy, the Squeeze Out (POP! and Lucy waiting outside), Squishy → Tea Party. Stills + CSS animation + sound, ≤20 s, always skippable, the deck visibly flies up and lands restyled, replayable from a Movies menu.
- **The ending (Wyatt's design, DESIGN.md §6):** window jump (Wyatt/Aaron leap, Liam waddles out the door) → the gravel patch on the farm → Stella and Lucy run to Delilah → barn, Goldie in her fence, grain bins, the house, trees → Aunt Savanah's shiny gray car picks up the girls and drives off down the tree-lined lane → victory song with synced lyrics → credits.
- **Sass Levels 1–10** (post-first-win ascension, one stacking modifier each).

## Phase 4 — Balance

- Harness bots that genuinely play each hero mechanic, each world trait, and three economy strategies (Saver / Spender / Arena-hunter).
- Rails (all must hold, reported in PROGRESS.md): first-run winrate ~25% per hero (20–30), parity within 8 points · no economy strategy beats another by >10 points · median fight turns: normals 3–6, elites 6–10, bosses 8–14 · average Sass per World-3 fight < 1.5 · no card or sticker in >50% of winning decks · **every starter deck beats every World-1 normal fight in >90% of sims** · no Tea Party Rule drops any one hero's World-3 fight winrate by >15 points vs the others · deaths-by-encounter report shows no single spike >35% of all deaths · estimated run length 35–40 min (turn count × a measured seconds-per-turn from e2e) · Sass Levels monotonic, SL10 < 10%.

## Phase 5 — Art (gpt-image)

1. **Style gate first (self-check, not a stop):** write the four style blocks (base farm storybook gouache — RL1–3's block verbatim; Dreamhouse glossy pink plastic; squishy-toy pastel; fancy tea party china/lace). Take **one card + Wyatt's portrait** through all four looks via base → `--ref`-edit per world. Check recognition rules (same subject, pose, composition; card legible at phone size). Screenshot the four side by side into REVIEW.md. Adjust style blocks, then proceed.
2. **Bulk:** hero portraits × 4 looks · every card × 4 looks (base painted first, world versions edited from it with the base as `--ref`) · all enemies (their own world's look) · cousins (normal + phase art; Lucy's Mega Squish; Delilah's TANTRUM) · pets × worlds seen · visitors in scene · world backdrops + maps · shop/rest/treasure room art per world · world-jump stills · ending stills (window, gravel patch, farm with barn/Goldie/grain bins/house/trees, Savanah's car, the lane) · title art · app icon.
3. Codex backend, lanes and limit handling per ground rule 6. Batch with retries; reroll only clear failures; `optimize` pass (RL3's `optimize-art.sh` pattern).

## Phase 6 — Music & the ending song (suno-auto, take 1 kept)

Tracks: `title`, `map_w1`, `map_w2`, `map_w3`, `battle_w1..w3`, `boss_stella`, `boss_lucy`, `boss_delilah`, `victory` sting, **`ending` — the victory song for Wyatt's ending** (lyrics about the cousins, the three worlds, and the window jump; word-level `.lrc`), optional hero anthems for credits. Lyrics → REVIEW.md.
**Ending video:** follow the vault's music-video skill (`<vault>/.claude/skills/music-video/SKILL.md` and its `field-notes.md`) to make the ending an animated, word-synced video over the ending stills. One shared song; the opening shot varies by hero. Lazy-loaded, skippable, replayable; the game never waits on it offline (the in-engine credits are the fallback).

## Phase 7 — Ship hardening

Offline sw (namespaced), predictive prefetch per world (skins + art for the next world load during the current one), 128 kbps audio, PWA manifest + A2HS, Farm Code UI, screen wake lock, landscape + portrait phone layouts, full dual-engine e2e (including a full scripted run through all three worlds and the ending), every-screen smoke screenshots per world look into PROGRESS.md.

## Polish floor — acceptance criteria (carried from RL3, plus RL4 items)

1–10: **everything in `~/code/rolfe-legends-3/GOAL.md` §Polish floor**, ported item for item (13-point legibility audit, cause-and-effect card feel with SLOW & CLEAR default + FAST toggle, sequenced enemy turns, victory beats, nothing invisible, decision support, scene banners, story interstitials, ship plumbing, credits robustness).
11. **Rules are never invisible:** the current Tea Party Rule is on a banner all fight; a card that would break it glows with "breaks the rule!" before it's played; Delilah's next-turn rule is shown a turn early.
12. **Every world trait telegraphs:** the squish meter shows how much it will soak this turn; the Nuh-Uh Shield shows its points; Stella's next outfit is always visible.
13. **Money is legible:** after each fight, a coin tally shows base + each pet's earnings; the Arena node shows its fee and whether you can afford it.
14. **World-jump lands:** the deck transformation is unmistakable, and a card is recognizable across all four looks at phone size.
15. **Kid readability:** every card's text passes a plain-words check (no StS jargon: "Strength", "Vulnerable", "Exhaust" are replaced by the plain-words names in DESIGN.md, or explained by a tap chip).

## The quality rubric (RL2's eight + RL4's three)

RL2's eight (solvable turns, real path dilemmas, deck identity by mid-run, escalating power fantasy, paid-for risk, fights end before boring, fairness on screen, runs tell stories), plus:
9. **Three heroes, three different games.** Each hero's two ways to play are both viable in the harness and feel different to play.
10. **Aaron's loop pulls.** The spend-or-save decision is real every shop and Arena; no strategy dominates.
11. **Each world feels like a new place** within the first two floors — look, sound, challenge.
Grade honestly in PROGRESS.md at each phase end; ✗ = remaining work.

## Definition of done

Phases 0–7 complete; polish floor verified; all Phase 4 rails green; unit + selfplay + dual-engine e2e green; art and music present for every hook (emoji/silence fallbacks intact); REVIEW.md contains: the Gaps & Personalization report (low-res Stella/Lucy photos, anything painted best-effort), all dialogue and lyric drafts, kid-credited deviations, images generated vs planned (and any left on emoji because of plan limits), and the publish checklist (new public repo `jmoranii/rolfe-legends-4` + Pages). Stop there — Phase 8 (publish) is James's.
