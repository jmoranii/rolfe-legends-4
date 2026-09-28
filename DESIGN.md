# Rolfe Legends 4: Attack of the Cousins — Design

**Bottom line.** A Slay-the-Spire-style card roguelike: three heroes fight through three cousin-themed worlds in ONE run with ONE deck that carries all the way to the final boss (the RL2 structure, not RL3's reset-per-world). Everything the player sees is new: three hero mechanics the series has never used, three all-new bestiaries, an in-run money economy built on Aaron's pet idea, StS2-style family visitors, and art that completely changes style in each world. Built Act 1 first with placeholder art, playtested by the boys, then the rest.

Status: **v1.1, Sun 2026-09-27** (v1 + the second Codex review's numeric/rules fixes, §13 — §13 wins on any conflict) — written from the live co-design session with Wyatt (10) and Aaron (8), with James's calls on the Codex adversarial review folded in. Numbers are starting points for the selfplay harness, not final. Next: a second adversarial review on this doc (numbers + combos), then Act 1 build.

Source of the ideas (credit matters — the boys' ideas are load-bearing):
- **Wyatt:** the heroes and their names, the cousins as bosses fought oldest→youngest, the Dreamhouse, fighting through the inside of a squishy and squeezing out to find Lucy waiting, squishy = real squishy toys (dumplings, stretchy monkeys, NeeDohs), the whole ending.
- **Aaron:** the money loop (battle → win a money-maker → pay to battle again; harder battles → better money-makers), paying to enter AND buying upgrades, worlds themed to each boss.
- **James:** card game, one run/one deck, StS2-inspired and not a reskin, family visitors (StS2 Ancients), every world restyles all the art, cutscenes, simplified for kids, name-brand toys OK, same public posture as RL1/RL3.
- **Hugo:** the mechanics and numbers below, the enemy rosters (boys to rename/cut), the Tea Party Rules, all Codex-review fixes.

---

## 1. Pillars

1. **Not a reskin.** Reuse the RL2 *engine* (turns, energy, intents, seeded RNG, map, save); never its *content*. No RL2/RL3 card, enemy, relic, event, or status reused as-is. Every hero mechanic must support **two different ways to play** and create decisions RL2/RL3 didn't have.
2. **Kid-fair and readable.** Every enemy intent shows exact numbers. Every rule is visible before it matters. Nothing changes mid-turn. The test for every card: Aaron understands it with no one explaining.
3. **Hard, not mean.** Target ~25% first-run winrate per hero (Wyatt asked for hard). Deaths are earned; no feel-bad cancels, no unwinnable spirals, no invisible rules.
4. **One new idea per fight** in the early game (RL1's teach-by-doing lesson).
5. **Each world looks, sounds, and plays different.** Each world has a look, one signature challenge, its own enemies, its own shop/rest/treasure dressing, and a themed Arena.

## 2. Core combat (the kept StS rules)

- **3 ⚡ per turn, draw 5**, block disappears at the start of your turn, enemies telegraph **intents** with exact numbers.
- Pick 1 of 3 cards after fights; skip allowed. Card upgrades at rest spots (**+** version = bigger numbers only; never new rules).
- StS scale numbers (RL2's call): hero HP 65–80, hits 3–30.

### The effect list (the whole game has these four)

| Effect | Plain-words text | StS original |
|---|---|---|
| **Pumped** | Your attacks deal +1 damage per Pumped. | Strength |
| **Wobbly** | Deals 25% less attack damage. Goes down by 1 each turn. | Weak |
| **Wide Open** | Takes 50% more attack damage. Goes down by 1 each turn. | Vulnerable |
| **Slimed** | (on a card) This card costs 1 more for the rest of this fight. | StS2-ish card debuff |

Plus three **world traits** that live only on specific enemies or fights and are explained by a pop-up the first time they appear: **Squishy** (World 2), **Tea Party Rules + Sass** (World 3), **Nuh-Uh Shield** (Delilah). Hero meters (Momentum, Big Hammer, Potty) are each hero's own and always on screen.

## 3. Heroes

Each hero: starter deck of 10, a starter treasure, and a reward pool of 15 (6 common / 6 uncommon / 3 rare). Every card lists its inspiration in code comments.

### ⚡ Wyatt the Speedy — 70 HP — mechanic: **Momentum**

**Momentum:** every card you play this turn adds 1 Momentum (shown on a speedometer). It resets to 0 at the start of your turn. Cards pay off at **thresholds** ("if Momentum is 3+") or **scale** with it ("+2 per Momentum").
- **Way to play 1 — Burst turns:** cheap cards + draw to hit big thresholds.
- **Way to play 2 — Steady scaler:** fewer, bigger "per Momentum" cards.
- **Infinite guard:** no card both costs 0 and draws without exhausting; stickers can't reduce a card below 1 ⚡.

Starter treasure — **Stopwatch:** the first time you reach 4 Momentum in a fight, gain 1 ⚡.

Starter deck (10): 4× **Kick** (1⚡ deal 6) · 4× **Dodge** (1⚡ 5 block) · 1× **Quick Step** (0⚡ draw 1, exhaust) · 1× **Dash Attack** (1⚡ deal 3, +2 per Momentum).

| Card | Rarity | Cost | Text | Inspired by |
|---|---|---|---|---|
| Zoom | C | 1 | Deal 7. If Momentum 3+, draw 1. | StS1 Sneaky Strike (conditional) |
| Cartwheel | C | 1 | Gain 5 block. Draw 2. | StS1 Backflip |
| Quick Pass | C | 0 | Deal 3. | StS1 Shiv |
| Tap Tap | C | 1 | Deal 3 twice. | StS1 Twin Strike |
| Juke | C | 1 | Gain 8 block. If Momentum 3+, gain 4 more. | StS1 Dodge and Roll |
| Warm Up | C | 0 | Draw 1. Exhaust. | StS1 Prepared |
| Slide Tackle | U | 1 | Deal 6. Apply 1 Wobbly. | StS1 Neutralize+ |
| Hat Trick | U | 1 | Deal 4. If Momentum 3+, deal 4 two more times. | StS1 Finisher |
| Blur Kick | U | 2 | Deal 4 per Momentum (this card counts). | StS2 scaling attacks |
| Shuffle Step | U | 1 | Discard your hand, draw that many. | StS1 Calculated Gamble |
| Keep Moving | U | 1 | Power: whenever you play your 4th card in a turn, gain 5 block. | StS1 After Image |
| Whirlwind Kick | U | 1 | Deal 3 to ALL enemies. If Momentum 3+, do it again. | StS1 Dagger Spray (Wyatt's AoE answer) |
| Lightning Legs | R | 2 | Power: your Momentum starts each turn at 2. | Original |
| Photo Finish | R | 2 | Deal 20. Costs 1 less for every 2 Momentum. | StS1 Masterful Stab / Eviscerate |
| Relay Race | R | 1 | Draw 2. The next time you play each of them this turn, it costs 0. Exhaust. | StS1 Setup-ish |

### 💪 Aaron the Strong — 80 HP — mechanic: **The Big Hammer**

**The Big Hammer** (inspired by StS2 Regent's forged blade): a signature card that starts **every fight in Aaron's hand** (2⚡, deal 12). Other cards **forge** it (+damage this fight) or **change how it swings**. Hammer bonuses reset after each fight. The Big Hammer can never be stolen, cancelled, or Slimed.
- **Way to play 1 — Forge:** build one enormous swing (Temper, Anvil, Forged in Rolfe).
- **Way to play 2 — Hammer tricks:** use the hammer's size for other things (Iron Stance block, Hammer Toss, Wide Swing).

Starter treasure — **Weight Belt:** the first time the Big Hammer hits each fight, gain 6 block.

Starter deck (10): 4× **Punch** (1⚡ deal 6) · 4× **Guard** (1⚡ 5 block) · 1× **Big Hammer** (2⚡ deal 12; always starts in hand) · 1× **Sharpen** (1⚡ Big Hammer +3 this fight, gain 4 block).

| Card | Rarity | Cost | Text | Inspired by |
|---|---|---|---|---|
| Uppercut | C | 1 | Deal 9. | StS1 Strike+ |
| Temper | C | 1 | Big Hammer +4 this fight. Gain 3 block. | StS2 Regent forge |
| Brace | C | 1 | Gain 8 block. | StS1 Defend+ |
| Shoulder Charge | C | 2 | Deal 14. Apply 1 Wide Open. | StS1 Bash-ish |
| Deep Breath | C | 0 | Draw 1. The next Big Hammer you play this turn costs 1 less. Exhaust. | Original |
| Iron Stance | C | 1 | Gain block equal to half the Big Hammer's damage. | StS1 Body Slam (inverted) |
| Wide Swing | U | 1 | This fight, the Big Hammer hits ALL enemies. Exhaust. | StS1 Cleave |
| Hammer Toss | U | 1 | Deal half the Big Hammer's damage. | Original |
| Get Pumped | U | 1 | Gain 2 Pumped. Exhaust. | StS1 Inflame |
| Anvil | U | 2 | Big Hammer +8 this fight. | StS2 Regent forge |
| Bounce Back | U | 1 | The next time you play the Big Hammer this turn, it comes back to your hand (once). | StS1 Headbutt-ish |
| Stomp | U | 1 | Deal 5 to ALL enemies. | StS1 Thunderclap |
| Forged in Rolfe | R | 2 | Power: each time you play the Big Hammer, it gets +3 for the rest of this fight. | StS1 Rampage |
| Titan Grip | R | 1 | Power: the Big Hammer costs 1. | Original |
| Legendary Swing | R | 3 | Deal the Big Hammer's damage twice (doesn't count as playing the Hammer). Exhaust. | StS1 Double Tap |

### 🚽 Liam the Potty Trained — 65 HP — mechanic: **the Potty meter**

**Potty meter (0–10):** Liam's cards add Potty. The moment it reaches 10: **FLUSH!** — deal 15 damage to ALL enemies, gain 5 block, meter back to 0 (bubbles and sparkles, never gross). The meter carries between turns but empties at the end of each fight.
- **Way to play 1 — Flush often:** fill fast, flush many times, grow the flush.
- **Way to play 2 — Hold it:** spend Potty on other things (block, damage) instead of flushing.

Starter treasure — **Sticker Chart:** the first FLUSH! each fight earns a gold star: +5 coins.

Starter deck (10): 4× **Toddle** (1⚡ deal 6, +1 Potty) · 4× **Hide** (1⚡ 5 block, +1 Potty) · 1× **Sippy Cup** (1⚡ +3 Potty, draw 1) · 1× **Waddle** (0⚡ +1 Potty).

| Card | Rarity | Cost | Text | Inspired by |
|---|---|---|---|---|
| Big Gulp | C | 1 | +4 Potty. | Original |
| Tantrum Toss | C | 1 | Deal 8. +1 Potty. | StS1 Strike+ |
| Blanket Fort | C | 1 | Gain 8 block. +1 Potty. | StS1 Defend+ |
| Wiggle | C | 0 | +1 Potty. | Original |
| Naptime | C | 2 | Gain 14 block. | StS1 Impervious-lite |
| Uh-Oh | C | 1 | Deal 4 to ALL enemies. +1 Potty. | StS1 Cleave-lite |
| Hold It! | U | 1 | Spend 4 Potty: gain 14 block. | StS1 Defect orb-evoke idea |
| Potty Dance | U | 1 | Deal 3 for every 2 Potty you have (doesn't spend it). | StS1 Heavy Blade-ish |
| Double Flush | U | 2 | Your next FLUSH! this fight happens twice. Exhaust. | StS1 Burst |
| Big Kid Stickers | U | 1 | Power: after each FLUSH!, draw 2. | Original |
| Big Boy Undies | U | 1 | Power: after each FLUSH!, gain 1 Pumped. | Original |
| Splash Zone | U | 1 | Apply 1 Wobbly to ALL enemies. +2 Potty. | StS1 Crippling Cloud |
| Royal Throne | R | 2 | Power: FLUSH! deals +10 damage. | Original |
| Emergency! | R | 0 | If Potty is 5+, FLUSH! right now. Exhaust. | StS1 Evoke-now |
| All By Myself | R | 2 | Spend all Potty: deal 4 × Potty to one enemy. | StS1 Skewer (X-cost) |

## 4. The run

- **3 worlds, one deck, one run.** Each world: a family-visitor scene, then a **10-floor branching map + boss**. Full run target **35–40 min** (fits the screen-time hour; RL2's target). **Turn budget: ~110 total turns per run including Arena waves** (~15 s/turn + ~8 min of scenes and decisions ≈ 35 min); measure completed-run duration, not just median fight length.
- Per world map: 10 floors + boss on floor 11. **Every path** has: floor-1 fight, ≥4 normal fights, 2 tough fights (never before floor 4), 1 shop, 1 treasure, rest on floor 10. The **Arena** sits on an optional branch where it **replaces one normal fight** (never the only path). A shop always comes before the Arena on its branch. No random events in v1 (scope; the visitor + Arena carry the variety).
- **After each boss:** **heal to full** (matches shipped RL2; first calibration pass — tune down only after measuring attrition) and pick 1 of 3 **Boss Treasures**. Rest spots heal 30% of max HP, rounded down.
- Saves: auto-save every node, `rl4_*` localStorage keys, a Farm Code for moving saves between devices (RL2 pattern). Service-worker caches namespaced per game (see the shared-origin fix).

### Family visitors (the StS2 "Ancients")

At the start of each world, a family member appears and offers **pick 1 of 3** — no downsides (kid rule). Boys may swap who visits.
- **World 1 — Grandma Rockie:** +10 max HP · choose a rare card from 3 · remove 2 starter cards.
- **World 2 — Grampa Flaj:** upgrade 3 cards of your choice · a Super pet · a random Treasure.
- **World 3 — Mom and Dad:** heal to full · a Boss Treasure from 2 · duplicate one card in your deck.

## 5. Aaron's economy (all inside the run)

Coins reset every run. No interest (cut). Numbers are StS-scale starting points.

- **Start with 50 coins.** **Base income (guaranteed):** normal fight 12–18 coins · tough fight 30 · boss 60. Never zero.
- **Money pets** (Aaron: "something that makes you money"): pets are money-makers only — they don't fight (RL3 did battle pets; keeping it simple). You carry up to **3 earning pets**; a 4th means choosing one to send home. After every fight you win, each pet earns coins:

| Tier | Earns per fight | Where it comes from |
|---|---|---|
| Common | 3 | 20% chance from normal fights (fight 3 of World 1 guarantees one) |
| Rare | 5 | Tough fights always drop a pet (50% Rare, else Common) |
| Super | 7 | Arena prize, Grampa Flaj |

  Pets are themed to the world they came from (Barbie world: Pink Poodle, Pony Pal; Squishy world: Squishy Kitten, Dumpling Pup; Tea Party: Teacup Pig, Fancy Parrot) — the boys should name the rest. Pets restyle with the world like everything else. **Growth:** a pet earns +1 once, after 5 fights with you (max +1).
- **Arena** (Aaron: "pay a little to battle"): one per world, optional. Entry fee **25 / 40 / 60** coins. Three waves back to back, no healing between. **It's ONE encounter for accounting:** no per-wave coins, one pet payout/growth tick after the final wave, no starter-treasure resets between waves. Prize: pick one — a **Super pet** OR a **rare card + a free sticker**. If you can't afford it, the node says so and you walk past. One visit only.
- **Shops** (Aaron: "buy stuff to make you stronger"): Stella's Closet (W1), Lucy's Squish Stand (W2), Delilah's Sweet Shop (W3). Stock: 5 cards (45 common / 70 uncommon / 140 rare), 3 stickers (50 each), remove a card (60, +15 per use).
- **Stickers** (StS2 enchantments): **one per card, lasts the run.**

| Sticker | On | Effect |
|---|---|---|
| ✨ Sparkle | attacks | +3 damage |
| ❤️ Heart | block cards | +3 block |
| ⭐ Star | any | Starts in your opening hand |
| ⚡ Lightning | cards costing 2+ | Costs 1 less (never below 1) |
| 🌈 Rainbow | cards costing 1+ | When played, draw 1 |
| 😊 Smiley | any | Stays in your hand at end of turn |

  Guards: Lightning and Rainbow can't go on the same card (one sticker per card handles it); nothing makes a card cost 0 or draw itself.

### Treasures (relics) — new pool of 10

Pink Car Keys (+1⚡ on turn 1) · Squishy Pillow (start each fight with 8 block) · Teacup of Courage (heal 3 after each fight) · Scrunchie (the first card you play each fight costs 0) · Glitter Jar (first time below half HP in a fight, gain 10 block) · Pinky Promise (start each fight with 1 Pumped) · Juice Box Straw (every 3rd turn, +1⚡) · Piggy Bank (+50 coins now) · Bubble Wand (start each fight: all enemies Wobbly 1) · Lucky Penny (card rewards show 4 choices).
**Boss Treasures** (pick 1 of 3 after Stella and after Lucy): Stella's Crown (+1⚡ every turn, no downside — the kid-version jackpot) · Lucy's Mega Squishy (gain 6 block every turn) · Golden Pet Collar (+1 pet slot) · Sticker Pack (3 free stickers, still one per card) · Party Hat (draw 1 extra card every turn).

## 6. Worlds, enemies, bosses

HP numbers are pre-harness; the harness tunes them. "Tough" = elite.

### World 1 — Barbie Dreamhouse → 👑 Stella, Queen of Barbies

**Look:** glossy pink plastic, sparkles; cards become doll boxes with a cellophane window; heroes become boxed dolls ("Speedy Wyatt — with real running action!"). **Challenge:** enemies hit often, so blocking matters. **Rooms:** pool (rest) · Stella's Closet (shop) · toy box (treasure) · pink elevator (map decoration).

| Enemy | HP | Pattern |
|---|---|---|
| Pink Pony | 28 | Gallop 5, then gains 2 Pumped every turn |
| Mannequin Trio | 3×10 | All three do the same move each turn: hit 3 each, or block 4 each |
| Shoe Stampede | 22 | Kick 2 × 4 hits |
| The Convertible | 34 | Honk (nothing) → Ram 14, repeating |
| Hairbrush Hydra | 30 | Bristles 3 × 3; every 3rd turn, you get Wobbly 1 |
| **Makeover Mirror** (tough) | 60 | Copy: hits you for the damage of the last attack card you played (max 15; shown in its intent) · Polish: block 10 |
| **Closet Monster** (tough) | 70 | Try On: takes a random card from your hand and holds it over its head (never the Big Hammer or a hero-meter card); it comes back after 2 turns or when the Monster is beaten · Swipe 10 |

**Stella** (160 HP): changes outfits in a **fixed, shown order** (the next outfit is always displayed): **Ballgown** (block 10 + hit 6) → **Sporty** (hit 4 × 4) → **Tiara** (calls a Barbie Guard: 12 HP, hits 4). At half HP, once: calls guards up to the cap. **Hard cap: 2 guards on the field, always.**

**Arena — the Fashion Show** (25 coins): Mannequin Trio → Pink Pony + Shoe Stampede → Runway Diva (50 HP, strikes a pose: hits 8 and gains 1 Pumped). Judges hold up score cards between waves (cosmetic).

### World 2 — Inside a Giant Squishy → 🫧 Lucy, Ruler of Squishies

**Look:** soft pastel, puffy, squishy shading; cards become squishy toys that slowly rise back after you play them; heroes become squishy-toy versions. **Challenge — Squishy:** some enemies have **Squishy N** — the first N damage they take each turn gets squished (a visible squish meter that refills every turn). The lesson: save up for **big turns** (every hero has a burst: Momentum turns, the Big Hammer, FLUSH!). *(Changed from "first hit halved" per the Codex review: that version rewarded a cheap opener and hurt Aaron.)*
**Rooms:** squishy cushion (rest) · Lucy's Squish Stand (shop) · squishy capsule machine (treasure). **Final floor: the Squeeze Out** — cutscene: *POP!* out of the squishy, and Lucy is waiting outside.

| Enemy | HP | Pattern |
|---|---|---|
| Squishy Dumplings | 3×14, Squishy 2 | Hit 4 · Slow Rise: a dumpling you didn't hit this turn heals 4 |
| Stretchy Monkey | 40 | Stretch (winding up) → SNAP 18, repeating |
| Cube NeeDoh | 45, Squishy 5 | Block 8 ↔ hit 7 |
| Gumdrop NeeDoh | 35 | Bounce: hit 6 twice |
| Teenie NeeDohs | 5×6 | Each hits 2 |
| Mesh Squish Ball | 38 | Ooze: Slimes a random card in your hand · hit 8 |
| Splat Ball | 30 | Splat: you get Wobbly 2 · hit 9 |
| Sticky Hand | 28 | Slap: removes 5 of your block, then hits 6 |
| **King NeeDoh** (tough) | 90, Squishy 8 | Each time you hit it, it gains 1 Pumped (max 6) · hit 10 |
| **Water-Bead Ball** (tough) | 70 | Hit 12 · when popped, bursts into 6 Beads (4 HP each, hit 2) |

**Lucy** (280 HP, Squishy 6): Squish Throw (hit 8 + Slimes a card) → Squeeze (block 12 + calls 2 Teenie NeeDohs) → Stress Test (hit 18). At half HP: **Mega Squish** — she squishes herself into a giant squishy: Squishy 8, hits 22 every other turn, no more summons.

**Arena — the Squeeze Race** (40 coins): Teenie NeeDoh swarm → Stretchy Monkey + Sticky Hand → Mega Stress Ball (60 HP, Squishy 6, hit 10).

### World 3 — Delilah's Sassy Tea Party → 💅 Delilah the Sassafras

**Look:** fancy china, lace doilies, pinkies out; cards become fancy place cards; heroes dress up (Wyatt: top hat with racing stripes · Aaron: bow tie on his muscles · Liam: frilly bonnet). **Challenge — Tea Party Rules:** every fight in this world shows **one manners rule on a big banner before your first turn**, and it never changes during your turn. Breaking it is always allowed: a card that would break it **glows orange with "breaks the rule!" before you play it.** Breaking it adds one **Sass** card ("Whatever. 🙄" — unplayable) to your draw pile.
- **Sass is fight-only and capped:** at most 3 Sass at a time; all Sass vanish when the fight ends; **Say Sorry** (a button, 1⚡) removes a Sass from your hand. *(Per the Codex review: no run-long junk spiral.)*
- **The five rules:** Pinkies Out (no more than ONE attack card over 12 damage per turn) · Inside Voices (no more than 6 cards in a turn) · No Elbows on the Table (no more than one block card on your first turn) · Take Turns (no two attacks in a row) · Clean Plate (don't end your turn with 2+ ⚡ unspent). Harness checks each rule against each hero so none is a hero-killer.

**Rooms:** fainting couch (rest) · Delilah's Sweet Shop (shop) · cake stand (treasure).

| Enemy | HP | Pattern |
|---|---|---|
| Teapot Tantrum | 36 | Heats up 1 → 2 → 3 (shown), then BOILS OVER for 30; repeats |
| Snooty Teacup Set | 4×12 | Each hits 3; when one breaks, the others gain 2 Pumped |
| Sugar Cube Twins | 2×24 | Take turns dissolving (can't be hit); one is always hittable · hit 7 |
| Rude Scone | 34 | Insult: adds 1 Sass · hit 7 |
| Spoon Knight | 32 | Poke 3 × 3 |
| **Teddy in a Tiara** (tough) | 75 + 2 guests (20 each) | Guests must be beaten before Teddy can be hit · Teddy gives each guest 2 block per turn · hits 9 |
| **Tea Time Clock** (tough) | 90 | Hit 11 · every 3rd turn: TEA TIME — all enemies heal 10 (**max 2 tea times per fight**) |

**Delilah** — Phase 1 (240 HP): **Because I Said So** — she announces NEXT turn's rule a turn early (banner shows "Next turn: ___") · **Sass Attack** (hit 12 + 1 Sass) · **Nuh-Uh Shield** every 3rd turn (shown): a 20-point shield that absorbs damage first; damage to it **stays** across turns, it never stacks or refills early, and excess damage on the breaking hit passes through to Delilah. Breaking it makes her Wide Open 2 (applies after the breaking hit). *(Replaces the "cancel your first card" idea per the Codex review.)*
Phase 2 — **TANTRUM** (160 HP): she flips the table; a Rude Scone and a Snooty Teacup join; she hits 16 → 20 alternating; no more rules (it's chaos — but every intent is still shown).

**Arena — the Etiquette Exam** (60 coins): three waves, each with a different Tea Party Rule: Spoon Knight + Teacups → Sugar Cube Twins → Headmistress Teapot (70 HP, boils over every 3rd turn for 25).

### The ending (Wyatt's design)

Delilah cracks open a window and jumps out. **Wyatt** or **Aaron** leaps out the window after her; **Liam** opens the door and waddles out. Outside: a big gravel patch — the tea party was inside Wyatt's house all along. Stella and Lucy run to Delilah's side. Around them: the barn, Goldie in her fence, the grain bins, the house, trees all around. Aunt Savanah pulls up in a shiny gray car, picks up the girls, and drives off down a tree-lined lane. The victory song plays over it (series tradition), then credits.

## 7. Teaching order (one new idea per fight)

World 1: Fight 1 = attack, block, intents · Fight 2 = your hero's meter (a pop-up names it) · first reward = pick a card · Fight 3 guarantees a Common pet (teaches pets + coins) · first shop = stickers · Arena explained on the map when first seen. World 2: first Squishy enemy triggers a one-time pop-up. World 3: first fight shows the Tea Party Rules banner with a one-time explanation. Every pop-up has "Got it" and never shows again.

## 8. Art — every world restyles everything

- **Four looks for every card and hero:** the base look (the farm, storybook gouache like RL1–3; title, hero select, deck before World 1) + Dreamhouse + Squishy + Tea Party. Entering a world plays the **world-jump**: your deck flies up and lands restyled.
- **Recognition rules:** across looks, a card keeps its name, cost gem, text, number placement, and the painting's composition (same subject, same pose). Only material, palette, and costume change. **Frames are CSS per world** (toy box, squishy, lace place card), so only the painting is regenerated.
- **Pipeline:** paint the base, then **edit it into each world style with the base as the reference image** (keeps it recognizable). Family likenesses (the heroes, cousins, Savanah) go through the **official OpenAI API only** (vault rule; not the Codex backend).
- **Count (rough):** ~52 unique cards × 4 looks ≈ 210, 3 heroes × 4 portraits = 12, ~30 enemies (one look each — they live in one world), 3 cousins × 2 (phase art), ~12 pets × up to 4, 3 visitors, backgrounds ~12, ending stills ~10. **~300 images.** API cost at medium quality is small (~$0.05 each); high quality for portraits and cousins only.
- **Gate:** before the bulk run, take ONE card and ONE hero through all four looks and check them on the actual tablet (Codex finding).
- Act 1 build and playtest use **emoji placeholder art** (RL2 v1 pattern).

## 9. Cutscenes and music

- **World-jump scenes (in-engine):** farm → Dreamhouse, Dreamhouse → inside the Squishy, the Squeeze Out (Lucy waiting), Squishy → Tea Party. Built from stills + CSS animation + sound: light, offline, ≤20 seconds, **always skippable**, replayable from a Movies menu.
- **The ending (music-video skill):** the victory song as an animated, word-synced video. One shared song; the opening shot varies by hero (window leap vs. waddle). Lazy-loaded, skippable, replayable; the game never waits on it offline.
- **Suno soundtrack:** title theme · 3 world battle themes · 3 cousin boss themes · the ending song · optional per-hero anthems for credits (RL2 tradition). ~8–11 tracks, `suno-auto` only, take 1.

## 10. Difficulty and balance

- **First-run winrate target ~25% per hero (rails 20–30%)**; hero parity within 8 points.
- **Replay ladder — Sass Levels 1–10** after the first win (ascension: enemies a bit tougher, pets a bit stingier, etc.).
- **Selfplay harness rebuilt for RL4** (RL2's is keyed to old cards): hero-aware bots that actually use Momentum, the Hammer, and the Potty meter, and **three economy strategies — Saver, Spender, Arena-hunter**. Report winrate per hero × strategy, **deaths by boss/elite**, coins unspent at death, % of runs that can't afford the Arena, Sass per World-3 fight, median turns per fight, and estimated run length.
- **Rails beyond winrate:** no economy strategy beats another by more than 10 points · median fight ≤ 8 turns (grind check) · average Sass per World-3 fight < 1.5 · no single card/sticker combo in >50% of winning decks · every hero's starter deck can beat every World-1 fight.
- **Then real playtests.** The harness is necessary, not sufficient: the boys play Act 1 before anything else gets built.

## 11. Content rules (carried from RL1–3, with James's RL4 calls)

- First names and family nicknames only; no surnames, birthdates, or real place names beyond "the farm." Grandparents: **Grampa Flaj** and **Grandma Rockie** (Wyatt's names).
- **The cousins are affectionate comedy.** Stella, Lucy, and Delilah are fabulous, squishy, and sassy — never mean or bad. A beaten cousin is *outplayed*, never hurt (RL3's duck rule).
- Potty humor stays light: bubbles, sparkles, "FLUSH!" — no gross-out.
- Never a curse or status named "Chores."
- **Name-brand toys are OK** (James, Sun 2026-09-27: "just for friends and family") — Barbie, NeeDoh. *(Overrides RL3's no-trademark rule for this game.)*
- **Public posture same as RL1/RL3** (James): the cousins' names and likenesses may appear in the public repo and Pages site. Reference photos stay gitignored and are never committed.
- Any secret stays zero-hint (RL2 white-dot lesson). Whether RL4 has one is James's private call; the spec never goes anywhere the boys might read over his shoulder.

## 12. Build order

1. **This doc → second Codex adversarial review** (numbers and combos) → James's calls.
2. **Scaffold:** CLAUDE.md constitution (pillars + content rules + no-port rule), GOAL.md, REVIEW.md; RL2 engine ported with content emptied; `rl4_*` save keys; namespaced service-worker cache.
3. **Act 1 vertical slice:** three heroes' full kits, all World-1 enemies + Stella, economy (pets, shop, stickers, Arena), Grandma Rockie, teaching pop-ups, emoji art. Harness + unit + e2e green.
4. **Boys playtest Act 1** → tune.
5. **Worlds 2–3** content + harness rails.
6. **Art** (gate test first) → **music** → **cutscenes + ending** → polish floor (RL3 GOAL.md §Polish floor) → dual-engine e2e → publish at James's go.

## 13. Rules clarifications (v1.1 — from the second Codex review; these win on conflict)

**Infinite guards**
- Any "costs 0 / costs less" effect applies to that card's **next play only**, never "this turn."
- A non-exhausting card with a 🌈 Rainbow sticker has a minimum effective cost of 1 (Photo Finish included).
- Big Hammer: Forge bonuses apply **after** the swing resolves. Bounce Back returns the next Hammer once. Legendary Swing copies damage only (no Hammer-play triggers, no return).
- Search-based test: from adversarial hands + stickers + treasures, every turn terminates within 40 plays.

**Stickers & treasures**
- One sticker per card, no duplicates; Lightning and Rainbow can never be on the same card (enforced even if a future effect allows two).
- ⭐ Star cards replace normal opening draws; at most 5 innate cards total (the Big Hammer counts); extras shuffle in normally.
- 😊 Smiley keeps an **unplayed** card in hand; it never returns a played card.
- Scrunchie discounts one payment; it never changes a card's stored cost.

**Potty / FLUSH!**
- Potty caps at 10; reaching 10 resets to 0 **before** the flush resolves; overflow is discarded (8 + 4 → flush, then 0).
- At most one Double Flush charge is held; consuming it resolves two separate flush events; each event triggers each power once.

**Timing**
- Enemy effects that target your hand (Closet Monster, Mesh Squish Ball) pick their target **before** your end-of-turn discard.
- Makeover Mirror's intent snapshots the last attack card played **on your previous turn**, and shows that number.
- Summoned enemies (Barbie Guards, Teenie NeeDohs, Beads, TANTRUM guests) first act on the **next** enemy cycle.
- A "hit" is each positive attack packet, including one fully absorbed by block or Squishy. All fractions round down. Slimed doesn't stack (+1 max).
- Tea Party Rules count **attack cards' damage** only; triggered damage (FLUSH!, powers, treasures) never breaks a rule.

**Code-review clarifications (Sun 2026-09-27, all pinned by tests)**
- "Hero-meter cards" the Closet Monster never takes = each hero's starter mechanic card (**Dash Attack, Sharpen, Apple Juice**) plus the Big Hammer.
- Enemy Block expires for the whole enemy group at the start of the enemy phase (StS), so Block one enemy gives another mid-phase lasts through your turn.
- A "hit" for on-hit reactions (King NeeDoh) is an ATTACK packet; FLUSH! and other triggered damage are not hits.
- Makeover Mirror copies your previous turn's last attack card exactly (max 15); if you played no attack, it uses its own move, Mirror Glare (5).
- An Arena wave's rule is announced when the wave arrives and applies at the start of your next turn.
- A targeted card can't be played when no enemy can be targeted (you're never charged for a card that hits nothing).
- When one Sugar Cube twin is beaten, the other solidifies at once.

**Economy accounting**
- Pet payouts happen after winning a fight, before new drops. The Arena is one encounter (see §5).
- Harness reports **spendable-before-final-shop** coins; "Saver" means saving for a later purchase, not hoarding.

**Review-2 baseline note:** shipped RL2 selfplay (300 runs/hero) measured 34.3 / 36.0 / 33.0% (Aaron / Wyatt / Liam), with full heal between acts — kinder than RL2's own DESIGN.md says. RL4's ~25% target is intentionally harder.

## Open

- ~~Savanah's name spelling~~ resolved: **Savanah** (James, Sun 2026-09-27).
- Pet roster names (boys) · visitor choices (boys may swap) · a secret (James, privately).
- Whether to add a few events per world after the Act 1 playtest.
