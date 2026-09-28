// Rolfe Legends 4 — in-engine cutscenes. Light (stills + CSS animation + sound),
// offline-safe, ≤20 s, ALWAYS skippable, replayable from the Movies menu.
//   worldJump — the headline moment: your whole deck flies up and lands restyled
//   storyCard — each world's gate card
//   squeezeOut — POP! out of the squishy… and Lucy is waiting (Wyatt's idea)
//   endingCutscene — Wyatt's ending, shot by shot (the video version plays first if present)
// deps (from game.js): { el, artImg, bgLayer, sfx, REDUCED, fxScale, cardFace }

import { sceneArt, endingArt, worldBg } from './skins.js';

function overlay(deps, cls) {
  const { el } = deps;
  const root = el('div', `cutscene ${cls}`);
  document.body.appendChild(root);
  return root;
}
function skipBtn(deps, root, onSkip) {
  const b = deps.el('button', 'cutscene-skip', 'skip ⏭');
  b.onclick = (ev) => { ev.stopPropagation(); onSkip(); };
  root.appendChild(b);
  return b;
}

const JUMP_COPY = {
  w1: { art: 'plunge_w1', line: '💗 WHOOSH! You got plunged into a giant BARBIE DREAMHOUSE!', flash: '#ff7ac8' },
  w2: { art: 'swallow_w2', line: '🫧 SLURP! A giant squishy just SWALLOWED you!', flash: '#9fe7d8' },
  w3: { art: 'arrive_w3', line: '🫖 Ahem. You have arrived at the fanciest tea party EVER.', flash: '#f4c7a1' },
};

// deck: array of card instances (a sample is shown); fromLook/toLook: 'base'|'w1'|'w2'|'w3'
export function worldJump(deps, { deck, fromLook, toLook }, onDone) {
  const { el, sfx, REDUCED } = deps;
  const copy = JUMP_COPY[toLook] || JUMP_COPY.w1;
  const root = overlay(deps, `jump look-${toLook}`);
  const bg = deps.bgLayer(sceneArt(copy.art), 'cutscene-bg');
  root.appendChild(bg);
  const cap = el('div', 'cutscene-cap', copy.line);
  root.appendChild(cap);
  const grid = el('div', 'jump-grid');
  root.appendChild(grid);
  const sample = deck.slice(0, 10);
  const faces = sample.map((c, i) => {
    const f = deps.cardFace(c, { look: fromLook, mini: true });
    f.style.setProperty('--ji', String(i));
    grid.appendChild(f);
    return f;
  });
  let done = false;
  const timers = [];
  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    root.classList.add('cutscene-out');
    setTimeout(() => { root.remove(); onDone(); }, REDUCED ? 0 : 350);
  };
  skipBtn(deps, root, finish);
  // reduced motion drops the ANIMATION, never the scene: the swap happens in place,
  // the caption and button still show, and the kid still taps "Let's go"
  const T = (ms, fn) => timers.push(setTimeout(fn, REDUCED ? Math.min(ms, 600) : ms));
  sfx.zoom();
  T(1400, () => { if (!REDUCED) grid.classList.add('fly-up'); sfx.whoosh(true); });
  T(2300, () => {
    const flash = el('div', 'jump-flash');
    flash.style.background = copy.flash;
    root.appendChild(flash);
    sfx.relic();
    // swap every card to the new world's look while they're off-screen
    faces.forEach((f, i) => {
      const nf = deps.cardFace(sample[i], { look: toLook, mini: true });
      nf.style.setProperty('--ji', String(i));
      f.replaceWith(nf);
      faces[i] = nf;
    });
    grid.classList.remove('fly-up');
    grid.classList.add('land');
    cap.innerHTML = `✨ Every card changed to match the world! ✨<br><small>Same cards, same powers — brand new look.</small>`;
  });
  T(5200, () => {
    const go = el('button', 'btn gold cutscene-go', 'Let\'s go! →');
    go.onclick = finish;
    root.appendChild(go);
  });
  timers.push(setTimeout(finish, 20000)); // real time, even with reduced motion
  return { finish };
}

export function storyCard(deps, { world, kicker, name, emoji, sub, line, button }, onDone) {
  const { el } = deps;
  const root = overlay(deps, `story look-w${world}`);
  root.appendChild(deps.bgLayer(worldBg(world, 'story'), 'cutscene-bg'));
  const inner = el('div', 'story-inner');
  inner.appendChild(el('div', 'story-kicker', kicker));
  inner.appendChild(el('div', 'story-emoji', emoji));
  inner.appendChild(el('h1', 'story-name', name));
  inner.appendChild(el('p', 'story-sub', sub));
  inner.appendChild(el('div', 'speaker-line story-line', line));
  const b = el('button', 'btn gold', button || 'Onward! →');
  b.onclick = () => { root.remove(); onDone(); };
  inner.appendChild(b);
  root.appendChild(inner);
}

export function squeezeOut(deps, onDone) {
  const { el, sfx, REDUCED } = deps;
  const root = overlay(deps, 'squeeze look-w2');
  root.appendChild(deps.bgLayer(sceneArt('squeeze_out'), 'cutscene-bg kenburns'));
  const pop = el('div', 'squeeze-pop', 'POP!');
  root.appendChild(pop);
  const cap = el('div', 'cutscene-cap', 'You squeezed and squeezed… and squeezed OUT!');
  root.appendChild(cap);
  let done = false;
  const timers = [];
  const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); root.remove(); onDone(); };
  skipBtn(deps, root, finish);
  sfx.squish();
  timers.push(setTimeout(() => { sfx.pop(); cap.innerHTML = '…and <b>Lucy</b> was waiting for you. 🫧👑'; }, REDUCED ? 300 : 1800));
  timers.push(setTimeout(() => {
    const go = el('button', 'btn gold cutscene-go', '😤 Bring it, Lucy!');
    go.onclick = finish;
    root.appendChild(go);
  }, REDUCED ? 500 : 3200));
  timers.push(setTimeout(finish, 14000));
}

// Wyatt's ending (DESIGN.md §6), shot by shot. Tap to advance, skip anytime.
export function endingShots(hero) {
  const heroShot = {
    wyatt: { img: '2_wyatt', text: '…and WYATT THE SPEEDY leaps right out the window after her! ⚡' },
    aaron: { img: '2_aaron', text: '…and AARON THE STRONG jumps right out the window after her! 💪' },
    liam: { img: '2_liam', text: '…and LIAM opens the door and waddles right out. 🚪🐧' },
  }[hero];
  return [
    { img: '1_window', text: 'Delilah is beaten… she cracks open a window… and JUMPS OUT! 🪟' },
    heroShot,
    { img: '4_farm', text: 'Outside: the big gravel patch. The barn. The grain bins. Goldie in her fence. The tea party was inside YOUR house the whole time! 🏡' },
    { img: '3_girls', text: 'Stella and Lucy run over to stand by Delilah. 👑🫧💅' },
    { img: '5_car', text: 'Then Aunt Savanah pulls up in her shiny gray car… 🚗✨' },
    { img: '6_lane', text: '…picks up the girls, and drives away down the lane through the trees. 👋' },
    { img: '7_heroes', text: 'The cousins will be back someday. But today? The LEGENDS win! 🏆' },
  ];
}
export function endingCutscene(deps, hero, onDone) {
  const { el, sfx } = deps;
  const root = overlay(deps, 'ending look-base');
  const shots = endingShots(hero);
  let i = -1, done = false, timer = 0;
  const stage = el('div', 'ending-stage');
  const cap = el('div', 'cutscene-cap ending-cap');
  root.append(stage, cap);
  const finish = () => { if (done) return; done = true; clearTimeout(timer); root.remove(); onDone(); };
  skipBtn(deps, root, finish);
  const next = () => {
    i += 1;
    if (i >= shots.length) return finish();
    const s = shots[i];
    const shot = deps.bgLayer(endingArt(s.img), 'ending-shot kenburns');
    stage.appendChild(shot);
    const old = stage.children.length > 1 ? stage.firstChild : null;
    if (old) setTimeout(() => old.remove(), 900);
    cap.innerHTML = s.text;
    cap.classList.remove('show'); void cap.offsetWidth; cap.classList.add('show');
    if (i === 0) sfx.whoosh(true); else if (s.img === '5_car') sfx.play(); else sfx.tap();
    clearTimeout(timer);
    timer = setTimeout(next, 4200);
  };
  root.addEventListener('click', (ev) => { if (!ev.target.closest('.cutscene-skip')) next(); });
  next();
}

// If the music-video ending exists, it plays first (lazy, skippable); any failure
// (offline + uncached, missing file) falls back to the in-engine version.
export function playEndingVideo(deps, onDone, onFail) {
  const { el } = deps;
  const root = overlay(deps, 'video-ending');
  const v = document.createElement('video');
  v.src = 'assets/video/ending.mp4';
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.preload = 'auto';
  v.controls = false;
  root.appendChild(v);
  let settled = false, stallTimer = 0;
  const done = (ok) => { if (settled) return; settled = true; clearTimeout(stallTimer); v.pause(); root.remove(); (ok ? onDone : onFail)(); };
  // offline and out of buffered video (only part was ever fetched): the credits take over
  v.addEventListener('waiting', () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => { if (!navigator.onLine && v.readyState < 3) done(false); }, 4000);
  });
  skipBtn(deps, root, () => done(true));
  v.addEventListener('ended', () => done(true));
  v.addEventListener('error', () => done(false));
  const failTimer = setTimeout(() => { if (v.readyState < 2) done(false); }, 6000);
  v.addEventListener('playing', () => { clearTimeout(failTimer); clearTimeout(stallTimer); });
  const p = v.play();
  if (p && p.catch) {
    p.catch(() => {
      // autoplay with sound blocked → a tap starts it
      const tap = el('button', 'btn gold cutscene-go', '▶️ Play the ending!');
      tap.onclick = () => { tap.remove(); v.play().catch(() => done(false)); };
      root.appendChild(tap);
      clearTimeout(failTimer);
    });
  }
}
