# PROGRESS

Updated every commit. Build started Sun 2026-09-27 (autonomous /goal, full game in one pass).

## Phases

| Phase | Status |
|---|---|
| 0 Chassis port | ✅ RL3 UI chassis + RL2-lineage engine patterns; all RL2/RL3 content stripped; no-port test; sw `rolfe-legends-4-v1` with the shared-origin fix + its test |
| 1 Combat core + heroes | ✅ Momentum · Big Hammer · Potty meter/FLUSH! · 4 effects · Squishy meter · Nuh-Uh Shield · Tea Party Rules + fight-only Sass · stickers · all §13 guards (infinite-turn search test) |
| 2 Run + economy | ✅ 3 worlds × (visitor → 10-floor map + boss), money pets, Arena, shops, stickers, treasures, boss treasures, full heal after bosses, teaching order |
| 3 Worlds, bosses, ending | ✅ all bestiaries; Stella's shown outfits, Lucy's Mega Squish, Delilah's announced rules + shield + TANTRUM; world skins; world-jump + story + Squeeze Out scenes; Wyatt's ending; Sass Levels 1–10; Movies menu |
| 4 Balance | ✅ rails ALL CLEAR (below) |
| 5 Art | ✅ 344/344 paintings on the codex backend ($0): likenesses first, cousins, scenes, ending, enemies, pets, and every card in four looks; 38 copied-logo repaints + 6 content fixes; every painting verified against the session that made it; `node tools/art_audit.mjs` → 355/355 hooks |
| 6 Music + ending video | ✅ 9 tracks incl. a theme per cousin (REVIEW.md §1) + word-level `ending.lrc` · the ending music video (2:33, music-video skill, all game art) in `assets/video/`, lazy, skippable, replayable, offline → credits |
| 7 Ship hardening | ✅ offline sw + prefetch per world, PWA, Save Code, wake lock, landscape/phone layouts, dual-engine e2e incl. full run + offline boot |

## Harness (node test/selfplay.mjs 150 — 1,350 full runs, latest gate)

- Winrate: **Wyatt 28.4% · Aaron 27.3% · Liam 28.2%** (rails 20–30, parity ≤ 8 pts) — strategies Saver 24.4 · Spender 28.7 · Arena-hunter 30.9 (≤ 10 pts). The 300-runs-per-cell confirmation run: 27.3 / 26.4 / 28.0, strategies 24.7 / 26.8 / 30.3.
- Median turns: fight 3 · elite 6 · boss 12 · arena 9 — completed run ≈ 123 turns ≈ **39 min** (15 s/turn + 8 min scenes)
- Coins/run: base ~317 · pets ~155 · Arena entered 1,041× (skipped broke 25×)
- Sass per World-3 fight **0.48** (< 1.5); no Tea Party Rule costs any hero > 15 pts of fight survival (all 94–99%)
- Deaths spread: Stella 25.4% · Lucy 22.6% · Delilah 12.0% · then tough fights (no spike > 35%)
- Starter decks beat every World-1 normal fight ≥ 90% (21/21)
- No dominant pick (card or card:sticker combo in > 50% of Delilah-reaching wins with ≥ 1.6× lift over losses)
- **Sass ladder** (test/ladder.mjs, same seeds per level): SL0 25.6 → SL1 18.9 → SL2 16.1 → SL3 15.0 → SL4 14.4 → SL5 11.1 → SL6 8.9 → SL7 8.9 → SL8 6.9 → SL9 4.4 → **SL10 2.5%** — ALL CLEAR

## Tests

- Unit: **565 passed** (node test/test.mjs) — incl. one pinned test per Codex code-review fix, the video/range service-worker bypass, and a parse check of every module
- e2e: **153/153** in Chromium + WebKit (node test/e2e.mjs; playwright pinned 1.60.0) — incl. reload mid-boss / on the boss splash, Arena prize can't be double-claimed, Save Code round-trip, offline boot, the ending video (plays, skips, never hangs offline), the cousins' secret wink + her own theme
- Smoke tour: see below (every screen × every look)

## Rubric (RL2's eight + RL4's three) — honest grades

1. Solvable turns ✓ (intents exact; preview = hit) · 2. Real path dilemmas ✓ (tough-or-normal, Arena, rest) · 3. Deck identity by mid-run ✓ (hero mechanics) · 4. Escalating power ✓ (Hammer forge, flush powers, Momentum powers) · 5. Paid-for risk ✓ (tough fights drop pets; Arena fee) · 6. Fights end before boring ✓ (median 3/6/12) · 7. Fairness on screen ✓ (rules banner, glow, shown outfit, squish meter, shield chip) · 8. Runs tell stories ✓ (world-jumps, cousins, the ending)
9. Three heroes, three games ✓ (harness parity + different top cards per hero) · 10. Aaron's loop pulls ✓ (strategies within 7 pts; spend-vs-save live every shop/Arena) · 11. Each world a new place ✓ (look, music, challenge, enemies within the first floors)

## Polish floor — verified (GOAL items 1–15; RL3's 1–10 ported)

| # | Item | Evidence |
|---|---|---|
| 1 | Legibility audit | tap-to-explain intents with live damage (`.intent[data-intent]`), status + power chips (`.chip[data-status]`, `[data-power]`), 📖 how-to-read modal, green/red live values (`val-up`/`val-down`), cost badges on every mini-card, draw / discard / used-up piles open on tap, staggered per-hit floaties, COUSIN BOSS / BIG TROUBLE ribbons, map spots name themselves on tap, energy orb, END TURN → 👀 ENEMY TURN |
| 2 | Cause-and-effect feel | cards fly to targets; per-family sounds (power, potty, forge clang, debuff, block, draw); per-hit ticks; SLOW & CLEAR default with a FAST toggle (one `--fx` knob); reduced motion wins |
| 3 | Sequenced enemy turns | one enemy at a time (`runEnemyPhase`), lunge / floaties / shake / death; no RL4 foe flees; the fight's end renders mid-enemy-phase |
| 4 | Victory beats | Coach James beat + coin tally + per-hero tip rotation; boss splash (now on the world's own painting) + boss-treasure reveal |
| 5 | Nothing invisible | power chips on the hero strip; auto-effects float; Sass shoves toast what + where; pet drops get a full reveal |
| 6 | Decision support | every stop screen shows ❤️ · 💰 · 🐾 pets · 🎴 My Deck (smoke tour: visitor, shop, rest, treasure, Arena) |
| 7 | Scene banners | Grandma Rockie, Grampa Flaj, Mom and Dad, and each shop/room painting ARE the headers |
| 8 | Story interstitials | farm intro + a story card per world + the Squeeze Out (full text: REVIEW.md §7) |
| 9 | Ship plumbing | wake lock in fights and credits; art self-heals (12 s retry); landscape + phone layouts; e2e self-hosts, clears coach bubbles, screenshots failures |
| 10 | Credits robustness | RL3's karaoke engine (indices from scratch each frame), staged intro, skip, silent/offline fallback — checked in the browser with the real song |
| 11 | Rules never invisible | rule banner all fight; "breaks the rule!" glow before play; Delilah's next rule a turn early (e2e) |
| 12 | Traits telegraph | squish-meter chip, Nuh-Uh Shield points, Stella's "then: 👗 Ballgown" (e2e + smoke) |
| 13 | Money legible | coin tally after every win; Arena fee on its map spot, red when you can't afford it |
| 14 | World-jump lands | every card flies up and lands restyled (e2e checks the look class); five cards × four looks side by side at tablet and phone size: `docs/smoke/base/card-looks.jpg`, `docs/smoke/phone/card-looks.jpg` |
| 15 | Kid readability | plain-words unit test over every card, chip, and tip (no Strength / Vulnerable / Exhaust) |

## Smoke tour

`node test/smoke.mjs` screenshots **every screen in every world look** (the farm, the three worlds × 20 screens, the ending shot by shot, phones) into `docs/smoke/<look>/`, with a contact sheet per look (`docs/smoke/sheet-*.jpg`) and a per-screen table of any art still on emoji or on a fallback painting (`docs/smoke/README.md`). Final run: **82 screens · 0 art slots on emoji · 0 fallback paintings · 0 missing backdrops · 0 page errors.** The e2e run's own shots go to `docs/smoke/e2e/` (gitignored).

## Log

- Sun 2026-09-27 — design v1.1 → scaffold → engine + harness (rails clear first real pass after tuning Stella/Lucy/Delilah) → UI + skins + cutscenes → 526 unit → e2e 114/114 → Lucy fixed in the three-girls still at James's request → Sass ladder retune → resume-mid-fight fix → Codex code review: 10 bugs, all fixed + pinned (541 unit, 130 e2e) → Stella (blonde, not golden/white) + Lucy (true-to-photo face) repainted in the group pictures at James's request → smoke tour (every screen × every look) + fixes it surfaced: bigger lone/paired foes on tablets, card reward + Arena prize centered, boss splash on its world painting (gold title was unreadable on the Tea Party cream), hero pick on the farm painting, wins shelf contrast; "Rolfe" as a place → "the farm" (content rule); REVIEW.md §7 = the whole script. → Barbie logos found in 38 Dreamhouse paintings (copied by the image model; CLAUDE.md: toys yes, logos no) → no-logo style clause + all 38 repainted, Stella by a frame-only edit → the ending music video (2:33) integrated, re-rendered over the repainted art; SW bypass + range serving so Safari streams it; offline stall → credits → final art check: two Liam cards in underwear + two paintings swapped by an image-tool race, all repainted, every painting audited to its session → 355/355 hooks, smoke 82 screens clean, gate green (544 · rails ALL CLEAR · e2e 137/137). → James's calls, one by one: keep the current Lucy; add a theme per cousin (3 Suno tracks); the secret = the cousins' winks (tap her portrait 3× on her intro, +💰10, crown screen counts them); squash the history; publish tonight. A parse check of every module now runs in the unit suite (it caught an unescaped apostrophe in the new lines before any browser did). Gate: 564 · rails ALL CLEAR · e2e 145/145. → Astra (gpt-6-astra, high) adversarial review of everything since the mid-build code review: 6 code defects confirmed and fixed (visitor treasure re-offered on reload; Arena SUPER pet lost on reload with a full pouch; ending-video stall watchdog could expire; cousin-theme fallback paused itself; theft protection wrongly blocked slime; replayed ending reset the secret count), each pinned by a test; gate 565 · rails + ladder ALL CLEAR · e2e 153/153.
