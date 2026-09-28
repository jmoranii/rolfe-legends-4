// Rolfe Legends 4 — synced-lyric victory credits (the RL1 crown-roll trick), set to
// "Attack of the Cousins", the ending song.
// Each hero's first win rolls an animated victory lap set to their Suno anthem:
// as the song names each family member, their painted portrait slides in, and
// the real lyric lights up word-by-word AS it is sung (Suno word-level timing,
// saved at assets/audio/<track>.lrc). Beats are DERIVED from the lyrics — the
// engine scans the timed words for cast names, so a re-generated anthem re-times
// the whole sequence with no code changes. Missing lrc → wall-clock + evenly
// timed fallback lines; missing art → emoji. Skippable always.

import * as music from './music.js';

// name triggers → the painted cast (art is drop-in, emoji fallback)
const CAST = [
  { re: /^(stella)/i, art: 'assets/enemies/stella.jpg', bg: 'assets/bg/w1_battle.jpg', emoji: '👑', name: 'Stella', title: 'Queen of Barbies' },
  { re: /^(lucy)/i, art: 'assets/enemies/lucy.jpg', bg: 'assets/bg/w2_battle.jpg', emoji: '🫧', name: 'Lucy', title: 'Ruler of Squishies' },
  { re: /^(delilah)/i, art: 'assets/enemies/delilah.jpg', bg: 'assets/bg/w3_battle.jpg', emoji: '💅', name: 'Delilah', title: 'The Sassafras' },
  { re: /^(savannah|savanah)/i, art: 'assets/ending/5_car.jpg', bg: 'assets/ending/6_lane.jpg', emoji: '🚗', name: 'Aunt Savanah', title: 'Shiny gray car, right on time' },
  { re: /^(goldie)/i, art: 'assets/ending/4_farm.jpg', bg: 'assets/ending/4_farm.jpg', emoji: '🦙', name: 'Goldie', title: 'Guard llama. Saw everything.' },
  { re: /^(dreamhouse)/i, art: 'assets/bg/w1_story.jpg', bg: 'assets/bg/w1_battle.jpg', emoji: '🏠', name: 'The Dreamhouse', title: 'World 1' },
  { re: /^(squishy)/i, art: 'assets/bg/w2_story.jpg', bg: 'assets/bg/w2_battle.jpg', emoji: '🫧', name: 'The Giant Squishy', title: 'World 2' },
  { re: /^(tea)$/i, art: 'assets/bg/w3_story.jpg', bg: 'assets/bg/w3_battle.jpg', emoji: '🫖', name: 'The Tea Party', title: 'World 3' },
];

const HERO_SCENES = {
  wyatt: { re: /^(wyatt|whyatt)/i, art: 'assets/heroes/wyatt_base.jpg', emoji: '⚡', name: 'WYATT', title: 'The Speedy' },
  aaron: { re: /^aaron/i, art: 'assets/heroes/aaron_base.jpg', emoji: '💪', name: 'AARON', title: 'The Strong' },
  liam: { re: /^(liam|leeum)/i, art: 'assets/heroes/liam_base.jpg', emoji: '🚽', name: 'LIAM', title: 'The Potty Trained' },
};

const FINALES = {
  wyatt: { big: 'WYATT', sub: 'The Speedy — beat the Attack of the Cousins!' },
  aaron: { big: 'AARON', sub: 'The Strong — beat the Attack of the Cousins!' },
  liam: { big: 'LIAM', sub: 'The Potty Trained — beat the Attack of the Cousins!' },
};

// caption remaps: Suno mispronounced "Wyatt" and "Liam" (James, Sat 2026-08-02),
// so the anthems SING phonetic spellings (Whyatt, Leeum) while the captions
// display the real names — the RL1 trick, generalized.
const REMAP = [
  [/^whyatt/i, 'Wyatt'],
  [/^leeum/i, 'Liam'],
  [/^savannah/i, 'Savanah'], // sung "Savannah" for pronunciation; her name is spelled Savanah (James, Sun 2026-09-27)
];
function remapWord(w) {
  for (const [re, name] of REMAP) {
    if (re.test(w)) {
      const letters = w.replace(/[^A-Za-z]/g, '');
      const repl = letters === letters.toUpperCase() ? name.toUpperCase() : name;
      return w.replace(/[A-Za-z]+/, repl);
    }
  }
  return w;
}

// untimed fallback lines per anthem (used when the .lrc is missing: wall clock,
// one line every few seconds — the show still works offline/pre-music)
const FALLBACK_LINES = {
  ending: ['We got plunged in a Dreamhouse, pink from floor to sky', 'Stella in her ballgown with her tiara riding high',
    "It's the Attack of the Cousins!", 'Swallowed by a squishy, we bounced our way through', 'Lucy on her throne of squish',
    'Delilah made the rules up, "Nuh-uh!" she would call', 'She cracked open the window and she jumped right out',
    'Aunt Savannah pulled up in her shiny gray car', "It's the Attack of the Cousins!", 'Rolfe Legends!'],
};

// ---------- LRC parsing (Suno word-level; line-level tolerated) ----------

function parseTime(s) {
  const m = /(\d+):(\d+(?:\.\d+)?)/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Returns [{t, words: [{w, t}]}] or null.
//
// suno-cli `timed-lyrics --lrc` emits ONE WORD PER LINE:
//   [00:10.61] [Verse]     ← section marker; its time carries to the next word
//   Out                    ← bare word (inherits the carried time)
//   [00:11.21] in
//   ...
//   (blank line)           ← phrase break → one caption line
// Classic line-level and enhanced <t>word LRC are tolerated as fallbacks.
export function parseLrc(text) {
  if (!text) return null;
  const lines = [];
  let cur = [];
  let carryT = null;
  const flush = () => {
    if (cur.length) lines.push({ t: cur[0].t, words: cur });
    cur = [];
  };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { flush(); continue; }
    const m = /^\s*\[(\d+:\d+(?:\.\d+)?)\]\s*(.*)$/.exec(raw);
    if (m) {
      const t = parseTime(m[1]);
      const rest = m[2].trim();
      if (/^\[.*\]$/.test(rest)) { carryT = t; continue; }       // [Verse]/[Chorus] marker
      if (!rest) { carryT = t; continue; }
      // enhanced <t>word tags inside the line?
      const wordRe = /<(\d+:\d+(?:\.\d+)?)>\s*([^<]*)/g;
      let wm, any = false;
      while ((wm = wordRe.exec(rest)) !== null) {
        any = true;
        const wt = parseTime(wm[1]);
        for (const w of wm[2].trim().split(/\s+/)) if (w) cur.push({ w, t: wt });
      }
      if (!any) {
        const ws = rest.split(/\s+/);
        // a marker-timed bare word can sit way early (the marker marks the
        // SECTION start, not the word) — snap it to just before this word
        const prev = cur[cur.length - 1];
        if (prev && prev.bare && t - prev.t > 0.6) prev.t = Math.round(Math.max(prev.t, t - 0.35) * 100) / 100;
        if (ws.length === 1) cur.push({ w: ws[0], t });           // per-word format
        else {                                                    // line-level: spread gently
          flush();
          ws.forEach((w, i) => cur.push({ w, t: t + i * 0.28 }));
          flush();
        }
      }
    } else {
      // bare word: inherits the carried section time (or follows the last word)
      const w = raw.trim();
      if (/^\[.*\]$/.test(w)) continue;
      const t = carryT != null ? carryT : (cur.length ? cur[cur.length - 1].t + 0.01 : 0);
      cur.push({ w, t, bare: true });
    }
    carryT = null;
  }
  flush();
  if (!lines.length) return null;
  // Repair Suno alignment glitches: a run of implausibly BUNCHED words (many
  // words squeezed into ~a second) right before a >5s cliff means the cluster
  // was stamped at the wrong time (seen: an intro phrase stamped at 0s though
  // sung at ~11s). Re-space the cluster to END just before the next reliable
  // word. Normally-spaced words before a long gap (real instrumental breaks)
  // are left alone.
  // Repair 0 — orphaned line tails (Aaron's "Poppa Flaj cheered … extra loud",
  // James's report Sun 2026-08-02): Suno sometimes stamps a caption line's last
  // 1–4 words AFTER a long instrumental break that really falls BETWEEN lines
  // (nobody pauses 12s mid-phrase). Snap the tail to follow the head at the
  // line's own cadence; the break then sits harmlessly between captions.
  // The mirror-image glitch — a BUNCHED head before the cliff (Wyatt's intro) —
  // means the head is the garbage side: defer to the cluster pass below, which
  // re-anchors heads forward. Same bunching criterion as that pass.
  const ws0 = lines.flatMap((l) => l.words);
  const bunchedBefore = (gi) => {
    let s = gi - 1;
    while (s > 0 && ws0[s].t - ws0[s - 1].t < 1.0) s--;
    const n = gi - s;
    return n >= 4 && (ws0[gi - 1].t - ws0[s].t) / (n - 1) < 0.35;
  };
  let gi0 = 0;
  for (const line of lines) {
    const w = line.words;
    for (let i = 1; i < w.length; i++) {
      if (w[i].t - w[i - 1].t <= 6) continue;
      if (w.length - i > 4) break; // long tail → not an orphan, leave for the cluster pass
      if (bunchedBefore(gi0 + i)) break;
      const cad = i >= 2 ? Math.min(0.6, Math.max(0.25, (w[i - 1].t - w[0].t) / (i - 1))) : 0.42;
      for (let k = i; k < w.length; k++) w[k].t = Math.round((w[k - 1].t + cad) * 100) / 100;
      break;
    }
    gi0 += w.length;
  }
  const ws = lines.flatMap((l) => l.words);
  for (let i = 1; i < ws.length; i++) {
    if (ws[i].t - ws[i - 1].t <= 5) continue;
    let start = i - 1;
    while (start > 0 && ws[start].t - ws[start - 1].t < 1.0) start--;
    const n = i - start;
    if (n >= 4 && (ws[i - 1].t - ws[start].t) / (n - 1) < 0.35) {
      for (let k = start; k < i; k++) ws[k].t = Math.round((ws[i].t - 0.38 * (i - k)) * 100) / 100;
    }
  }
  for (const line of lines) line.t = line.words[0].t;
  return lines;
}

// derive portrait beats from the timed words
export function deriveBeats(lines, heroId) {
  const beats = [];
  const lastShown = new Map();
  let lastBeat = -3;
  // the all-finale shows the trio TOGETHER — any hero name summons the group
  // (separately they'd fall inside each other's cooldown: "Whyatt, Aaron, Leeum, arm in arm")
  const heroes = Object.values(HERO_SCENES);
  for (const line of lines) {
    for (const { w, t } of line.words) {
      const word = w.replace(/[^a-zA-Z]/g, '');
      if (!word) continue;
      let scene = null;
      for (const h of heroes) if (h && h.re.test(word)) scene = { kind: h.kind || 'hero', ...h };
      if (!scene) {
        for (const c of CAST) if (c.re.test(word)) { scene = { kind: 'cast', ...c }; break; }
      }
      if (!scene) continue;
      const cool = scene.kind === 'hero' ? 9 : 16;
      if (lastShown.has(scene.name) && t - lastShown.get(scene.name) < cool) continue;
      // a crowd of names ("Mom and Dad and Granny too…") CHAINS with min spacing
      // instead of dropping everyone after the first — every sung face appears
      // (James, Sun 2026-08-02) — unless the chain would drift silly-late.
      let bt = Math.max(0, t - 0.15);
      if (bt - lastBeat < 1.5) bt = lastBeat + 1.5;
      if (bt - t > 4) continue;
      beats.push({ t: bt, scene });
      lastShown.set(scene.name, t);
      lastBeat = bt;
    }
  }
  return beats;
}

// ---------- the roll ----------

// deps injected from game.js: { el, artImg, sfx, REDUCED }
export function creditsRoll(heroId, deps, onDone) {
  const { el, artImg, REDUCED } = deps;
  const track = 'ending';
  music.play(track);

  const root = el('div', 'credits');
  const bg = el('div', 'credits-bg');
  const stage = el('div', 'credits-stage');
  const cap = el('div', 'credits-caption');
  const skip = el('button', 'credits-skip', 'skip ⏭');
  root.append(bg, stage, cap, skip);
  document.body.appendChild(root);

  let lines = null, beats = [], duration = 95;
  let beatIdx = -1, lineIdx = -1, capWords = [], curSlide = null;
  let ended = false, raf = 0, wallBase = null, started = false, hintEl = null;

  const audioEl = () => document.querySelector(`audio[data-track="${track}"]`);
  const clock = () => {
    const a = audioEl();
    if (a && !a.paused && a.currentTime > 0.05) return a.currentTime;
    return wallBase != null ? (performance.now() - wallBase) / 1000 : 0;
  };

  function setBg(path) {
    bg.style.opacity = '0';
    setTimeout(() => {
      bg.style.backgroundImage = path ? `url("${path}")` : 'none';
      bg.style.opacity = '1';
    }, 180);
  }

  function showSlide(build) {
    const slide = el('div', `credits-slide${REDUCED ? '' : ' enter-right'}`);
    build(slide);
    const old = curSlide;
    stage.appendChild(slide);
    curSlide = slide;
    if (old) {
      if (REDUCED) old.remove();
      else {
        old.classList.remove('enter-right');
        old.classList.add('exit-left');
        setTimeout(() => old.remove(), 700);
      }
    }
  }

  function introSlide() {
    setBg('assets/ui/title.jpg');
    showSlide((s) => {
      s.append(el('div', 'credits-crown', '👑'));
      s.append(el('div', 'credits-big', FINALES[heroId].big));
      s.append(el('div', 'credits-intro',
        `<div class="ci ci-1">🎉 You did it!</div>` +
        `<div class="ci ci-2">Sit back — here comes your victory song.</div>` +
        `<div class="ci ci-3">🎬 Everybody takes a bow — cousins too! <span class="ci-go">→</span></div>`));
    });
  }

  function sceneSlide(scene) {
    setBg(scene.kind === 'cast' ? scene.bg : 'assets/ending/7_heroes.jpg');
    showSlide((s) => {
      if (scene.kind !== 'cast') s.append(el('div', 'credits-crown small', '👑'));
      s.append(artImg(scene.art, scene.emoji, `credits-portrait${scene.kind === 'hero' ? ' hero' : ''} in-pop`));
      const card = el('div', 'credits-titlecard');
      card.append(el('div', 'cn', scene.name), el('div', 'ct', scene.title));
      s.append(card);
    });
  }

  let continued = false;
  function finaleSlide() {
    if (continued) return;
    continued = true;
    setBg('assets/ui/title.jpg');
    showSlide((s) => {
      s.append(el('div', 'credits-crown', '👑'));
      s.append(el('div', 'credits-big', FINALES[heroId].big));
      s.append(el('div', 'credits-sub', FINALES[heroId].sub));
      s.append(el('div', 'credits-crew', `Designed by <b>Wyatt</b> &amp; <b>Aaron</b> · made with love by <b>Uncle James</b><br><span class="dim">Music by Suno · Rolfe Legends 4 · 2026</span>`));
    });
    skip.remove();
    const btn = el('button', 'btn gold credits-continue', '👑 Continue');
    btn.onclick = finish;
    root.appendChild(btn);
  }

  function finish() {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    root.remove();
    onDone();
  }
  skip.onclick = finaleSlide;

  function loop() {
    const t = clock();
    // indices recompute from scratch each frame so the roll RESYNCS if the
    // clock ever jumps backward — e.g. the wall-clock rescue started, then the
    // real song began at 0:00 (slow first load / blocked autoplay). The old
    // forward-only advance left Aaron's karaoke stuck seconds ahead of the
    // singing for the whole roll (James's report, Sat 2026-08-02).
    let bi = -1;
    while (bi + 1 < beats.length && beats[bi + 1].t <= t) bi++;
    if (bi !== beatIdx) { beatIdx = bi; if (bi >= 0) sceneSlide(beats[bi].scene); }
    if (lines) {
      let li = -1;
      while (li + 1 < lines.length && lines[li + 1].t <= t) li++;
      if (li !== lineIdx) {
        lineIdx = li;
        cap.innerHTML = '';
        capWords = [];
        if (li >= 0) {
          const inner = el('div', 'cap-inner');
          capWords = lines[li].words.map(({ w, t: wt }) => {
            const s = el('span', 'cw');
            s.textContent = remapWord(w) + ' ';
            inner.appendChild(s);
            return { s, wt };
          });
          cap.appendChild(inner);
          cap.classList.remove('show'); void cap.offsetWidth; cap.classList.add('show');
        }
      }
      // karaoke: light each word the moment it's sung; held notes don't creep,
      // and a backward resync un-lights cleanly
      for (const cw of capWords) {
        const on = t >= cw.wt;
        if (on !== !!cw.lit) { cw.lit = on; cw.s.classList.toggle('lit', on); }
      }
    }
    const a = audioEl();
    if (!continued && (t >= duration || (a && a.ended))) finaleSlide();
    raf = requestAnimationFrame(loop);
  }

  function startRoll(useWall) {
    if (started) return;
    started = true;
    if (hintEl) { hintEl.remove(); hintEl = null; }
    if (useWall) wallBase = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // load the timed lyrics, then arm the clock
  fetch(`assets/audio/${track}.lrc`)
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null)
    .then((text) => {
      lines = parseLrc(text);
      if (!lines) {
        // fallback: evenly spaced untimed lines on the wall clock
        const fl = FALLBACK_LINES.ending || [];
        lines = fl.map((l, i) => ({
          t: 8 + i * 9,
          words: l.split(/\s+/).map((w, j) => ({ w, t: 8 + i * 9 + j * 0.35 })),
        }));
        duration = 8 + fl.length * 9 + 8;
      } else {
        const lastLine = lines[lines.length - 1];
        duration = Math.max(...lastLine.words.map((w) => w.t)) + 7;
      }
      beats = deriveBeats(lines, heroId);
      introSlide();
      if (!music.isEnabled()) { startRoll(true); return; }
      // roll the instant the anthem is audibly playing; if autoplay is blocked
      // a tap hint appears and the first tap starts the song in sync
      const armed = setInterval(() => {
        const a = audioEl();
        if (a && !a.paused && a.currentTime > 0.05) { clearInterval(armed); startRoll(false); }
      }, 110);
      setTimeout(() => {
        if (!started) { hintEl = el('div', 'credits-hint', '🎵 Tap to start the song'); root.appendChild(hintEl); }
      }, 600);
      root.addEventListener('pointerdown', () => { if (!started) { music.unlock(); music.play(track); } });
      // wall-clock rescue: never leave a kid stuck on a frozen intro
      setTimeout(() => { if (!started) startRoll(true); }, 6000);
    });

  return { finish };
}
