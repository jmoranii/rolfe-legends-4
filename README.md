# Rolfe Legends 4: Attack of the Cousins

A Slay-the-Spire-style card game for Wyatt and Aaron, co-designed with them on Sun 2026-09-27. Three heroes — **Wyatt the Speedy**, **Aaron the Strong**, **Liam the Potty Trained** — take on their cousins across a **Barbie Dreamhouse** (Stella, Queen of Barbies), the **inside of a giant squishy** (Lucy, Ruler of Squishies), and a **sassy tea party** (Delilah the Sassafras). One run, one deck, and every card and portrait changes to match the world you're in.

- Play: `python3 -m http.server 8204` in this folder → <http://localhost:8204> (or GitHub Pages once published)
- Design: [DESIGN.md](DESIGN.md) · build rules: [CLAUDE.md](CLAUDE.md) · plan: [GOAL.md](GOAL.md) · status: [PROGRESS.md](PROGRESS.md) · James's list: [REVIEW.md](REVIEW.md)
- Tests: `node test/test.mjs` · `node test/selfplay.mjs 150` · `node test/ladder.mjs 40` · `node test/e2e.mjs` · screenshots of every screen in every look: `node test/smoke.mjs` → [docs/smoke/](docs/smoke/README.md)
- Art: `python3 tools/art.py run` (gpt-image, codex backend) → `python3 tools/optimize_art.py` → `node tools/art_audit.mjs` (every art/music hook present?) · the whole script for review: `node tools/script.mjs` → REVIEW.md §7
- The ending music video (`assets/video/ending.mp4`) streams by byte range: GitHub Pages and the e2e server serve ranges, `python3 -m http.server` doesn't (Safari won't play it from there; the game falls back to the karaoke credits).

Vanilla HTML/CSS/JS, no build step, works offline after the first visit.
