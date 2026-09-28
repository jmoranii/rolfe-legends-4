// Rolfe Legends 4 — world looks (James's idea: when you jump into a world, ALL the
// art changes to match it). Four looks: 'base' (the farm — storybook gouache, the
// series style), 'w1' Barbie Dreamhouse, 'w2' squishy toys, 'w3' sassy tea party.
// Frames/boards/palettes are CSS (.look-*); paintings are per-look files with a
// fallback chain: this world's painting → the base painting → emoji. Pure paths.

export const LOOKS = ['base', 'w1', 'w2', 'w3'];
export const LOOK_NAME = { base: 'the Farm', w1: 'the Dreamhouse', w2: 'the Squishy World', w3: 'the Tea Party' };

export function lookFor(run) {
  if (!run || !run.world) return 'base';
  return `w${run.world}`;
}

// candidate paths, best first (the art loader tries them in order, then emoji)
export function heroArt(hero, look) {
  return look === 'base' ? [`assets/heroes/${hero}_base.jpg`] : [`assets/heroes/${hero}_${look}.jpg`, `assets/heroes/${hero}_base.jpg`];
}
export function cardArt(id, look) {
  if (id === 'sass') return ['assets/cards/sass_w3.jpg'];
  return look === 'base' ? [`assets/cards/${id}_base.jpg`] : [`assets/cards/${id}_${look}.jpg`, `assets/cards/${id}_base.jpg`];
}
// a pet is painted in its home world first; in later worlds it wears that world's look,
// falling back to its home-world painting
export function petArt(id, look, homeWorld) {
  const home = `assets/pets/${id}_w${homeWorld || 1}.jpg`;
  if (look === 'base') return [home];
  return [`assets/pets/${id}_${look}.jpg`, home];
}
export function enemyArt(artKey) { return [`assets/enemies/${artKey}.jpg`]; }
export function worldBg(world, kind) { return [`assets/bg/w${world}_${kind}.jpg`]; } // battle | map | shop | rest | treasure | arena | story
export function visitorArt(key) { return [`assets/visitors/${key}.jpg`]; }
export function endingArt(name) { return [`assets/ending/${name}.jpg`]; }
export function sceneArt(name) { return [`assets/scenes/${name}.jpg`]; }
