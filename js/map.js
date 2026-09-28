// Rolfe Legends 4 — world map generator (pure, seeded). 10 floors + the boss.
// RL2's non-crossing path-walk graph, with a FIXED floor schedule so every path
// meets the quotas (DESIGN.md §4, v1.1) and still offers real choices:
//   F1–F3 fight · F4 shop (before the Arena) · F5 tough-or-fight · F6 treasure ·
//   F7 fight-or-ARENA · F8 tough · F9 fight · F10 rest · F11 boss.
// Every path: ≥4 normal fights, 1–2 tough fights, 1 shop, 1 treasure, rest on F10.
// The Arena sits on an optional branch and replaces one normal fight.

import { makeRng } from './rng.js';

export const MAP_FLOORS = 11;   // boss floor
export const MAP_COLS = 4;
export const REST_FLOOR = 10;
export const BOSS_ID = 'boss';
const WALKS = 6;

const SCHEDULE = {
  1: ['fight'], 2: ['fight'], 3: ['fight'], 4: ['shop'], 5: ['elite', 'fight'],
  6: ['treasure'], 7: ['fight', 'arena'], 8: ['elite'], 9: ['fight'], 10: ['rest'],
};

export function generateWorldMap(seed, world) {
  // re-roll (deterministically) the rare layout whose floor 7 has one node: every world gets its Arena
  for (let salt = 0; salt < 12; salt++) {
    const m = buildMap(seed, world, salt);
    if (m.floors[7].length >= 2 || salt === 11) return m;
  }
  return null;
}

function buildMap(seed, world, salt) {
  const rng = makeRng((seed ^ Math.imul(world + 11, 0x9E3779B9) ^ Math.imul(salt, 0x85EBCA6B)) >>> 0);
  const nodeSet = new Set();
  const edgeSet = new Set();
  const starts = [];
  for (let w = 0; w < WALKS; w++) {
    let c = rng.int(MAP_COLS);
    if (w === 1) { let g = 8; while (c === starts[0] && g-- > 0) c = rng.int(MAP_COLS); }
    starts.push(c);
    nodeSet.add(`1-${c}`);
    for (let f = 1; f < REST_FLOOR; f++) {
      const nc = Math.max(0, Math.min(MAP_COLS - 1, c + rng.int(3) - 1));
      nodeSet.add(`${f + 1}-${nc}`);
      edgeSet.add(`${f}-${c}>${f + 1}-${nc}`);
      c = nc;
    }
  }
  const edges = {};
  const addEdge = (a, b) => { (edges[a] || (edges[a] = [])).includes(b) || edges[a].push(b); };
  // planarize each floor transition (re-pair sorted froms with sorted tos)
  for (let f = 1; f < REST_FLOOR; f++) {
    const pairs = [...edgeSet].map((s) => s.split('>')).filter(([a]) => Number(a.split('-')[0]) === f);
    const froms = pairs.map(([a]) => Number(a.split('-')[1])).sort((x, y) => x - y);
    const tos = pairs.map(([, b]) => Number(b.split('-')[1])).sort((x, y) => x - y);
    for (let i = 0; i < froms.length; i++) addEdge(`${f}-${froms[i]}`, `${f + 1}-${tos[i]}`);
  }
  const nodes = {};
  for (const id of nodeSet) { const [f, c] = id.split('-').map(Number); nodes[id] = { f, c, type: 'fight' }; }
  for (const id of Object.keys(nodes)) if (nodes[id].f === REST_FLOOR) addEdge(id, BOSS_ID);
  nodes[BOSS_ID] = { f: MAP_FLOORS, c: (MAP_COLS - 1) / 2, type: 'boss' };
  const byFloor = (f) => Object.keys(nodes).filter((id) => nodes[id].f === f).sort((a, b) => nodes[a].c - nodes[b].c);
  // type assignment by schedule; choice floors get both options (when ≥2 nodes)
  for (let f = 1; f <= REST_FLOOR; f++) {
    const ids = byFloor(f);
    const opts = SCHEDULE[f];
    if (opts.length === 1 || ids.length === 1) { for (const id of ids) nodes[id].type = opts[0]; continue; }
    const shuffled = rng.shuffle(ids);
    if (f === 7) shuffled.forEach((id, i) => { nodes[id].type = i === 0 ? 'arena' : 'fight'; }); // exactly one Arena
    else { const nTough = Math.max(1, Math.floor(ids.length / 2)); shuffled.forEach((id, i) => { nodes[id].type = i < nTough ? 'elite' : 'fight'; }); }
  }
  const floors = [];
  for (let f = 1; f <= MAP_FLOORS; f++) floors[f] = f === MAP_FLOORS ? [BOSS_ID] : byFloor(f);
  return { world, nodes, edges, floors };
}

export function reachableIds(map, pos) {
  if (!pos) return map.floors[1];
  return map.edges[pos] || [];
}

// every start→boss path (tests + the harness path-quota check)
export function allPaths(map) {
  const out = [];
  const walk = (id, path) => {
    const p = [...path, id];
    if (id === BOSS_ID) { out.push(p); return; }
    for (const n of map.edges[id] || []) walk(n, p);
  };
  for (const s of map.floors[1]) walk(s, []);
  return out;
}

export function validateMap(map) {
  const problems = [];
  const paths = allPaths(map);
  if (!paths.length) problems.push('no paths');
  const covered = new Set(paths.flat());
  for (const id of Object.keys(map.nodes)) if (!covered.has(id)) problems.push(`${id} not on any path`);
  for (const p of paths) {
    const t = p.map((id) => map.nodes[id].type);
    const n = (k) => t.filter((x) => x === k).length;
    if (n('fight') + n('arena') < 5 || n('fight') < 4) problems.push(`path too few fights: ${t.join(',')}`);
    if (n('elite') < 1 || n('elite') > 2) problems.push(`path elites ${n('elite')}`);
    if (n('shop') !== 1) problems.push('path shop count');
    if (n('treasure') !== 1) problems.push('path treasure count');
    if (map.nodes[p[p.length - 2]].type !== 'rest') problems.push('no rest before boss');
    const si = t.indexOf('shop'), ai = t.indexOf('arena');
    if (ai >= 0 && si > ai) problems.push('arena before shop');
    if (n('arena') > 1) problems.push('two arenas on a path');
  }
  const arenas = Object.values(map.nodes).filter((n) => n.type === 'arena').length;
  const f7 = map.floors[7].length;
  if (f7 >= 2 && arenas !== 1) problems.push(`arena count ${arenas}`);
  if (f7 >= 2 && !map.floors[7].some((id) => map.nodes[id].type === 'fight')) problems.push('arena is the only path');
  // non-crossing edges
  for (let f = 1; f < MAP_FLOORS; f++) {
    const es = [];
    for (const id of map.floors[f] || []) for (const to of map.edges[id] || []) if (to !== BOSS_ID) es.push([map.nodes[id].c, map.nodes[to].c]);
    for (const [a, b] of es) for (const [x, y] of es) if (a < x && b > y) problems.push(`crossing edges on floor ${f}`);
  }
  return problems;
}
