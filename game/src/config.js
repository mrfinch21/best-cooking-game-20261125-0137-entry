// The Gilded Ladle — a hearthside cooking rush.
// config.js: every number the game runs on. One job: tuning and layout.
// Nothing here reads the network, the disk or the environment.

export const VIEW = { width: 1280, height: 720 };

export const SHIFT_SECONDS = 180;
export const MAX_TICKETS = 4;
export const COMBO_WINDOW_SECONDS = 20;

// Orders arrive faster and lose patience sooner as the shift wears on.
export const SPAWN_FIRST_SECONDS = 3;
export const SPAWN_START_SECONDS = 16;
export const SPAWN_END_SECONDS = 9;
export const PATIENCE_START_SECONDS = 50;
export const PATIENCE_END_SECONDS = 32;

// Grill: a patty cooks in GRILL_SECONDS, then has OVERCOOK_SECONDS before it burns.
export const GRILL_SECONDS = 6;
export const OVERCOOK_SECONDS = 6;
export const CHOPS_NEEDED = 3;

export const CHEF_SPEED = 280; // px per second
export const CHEF_RADIUS = 22;
export const INTERACT_RANGE = 120; // px from a station's front edge

// The floor the chef may walk: the open kitchen between the counters.
export const FLOOR = { x: 16, y: 158, width: 1248, height: 484 };

// Ingredients. `process` says what the raw item needs before it can go on a plate:
// none (ready as-is), chop (the board) or grill (the stove).
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5484d', dark: '#a92c31', process: 'chop', chopped: 'tomato_chopped', emoji: '🍅' },
  lettuce: { name: 'Lettuce', color: '#57b25e', dark: '#2f7a37', process: 'chop', chopped: 'lettuce_chopped', emoji: '🥬' },
  onion: { name: 'Onion', color: '#d9c2f0', dark: '#9a7fc4', process: 'chop', chopped: 'onion_chopped', emoji: '🧅' },
  cheese: { name: 'Cheese', color: '#f2c14e', dark: '#b98a1d', process: 'none', emoji: '🧀' },
  bun: { name: 'Bun', color: '#e8b06a', dark: '#a9742f', process: 'none', emoji: '🍞' },
  patty: { name: 'Patty', color: '#8a5a3b', dark: '#5d3a24', process: 'grill', cooked: 'patty_cooked', emoji: '🥩' },
};

// Finished components that can sit on a plate, with the colour the plate draws them in.
export const COMPONENTS = {
  tomato_chopped: { name: 'Chopped Tomato', color: '#e5484d', dark: '#a92c31' },
  lettuce_chopped: { name: 'Chopped Lettuce', color: '#57b25e', dark: '#2f7a37' },
  onion_chopped: { name: 'Chopped Onion', color: '#d9c2f0', dark: '#9a7fc4' },
  cheese: { name: 'Cheese', color: '#f2c14e', dark: '#b98a1d' },
  bun: { name: 'Bun', color: '#e8b06a', dark: '#a9742f' },
  patty_cooked: { name: 'Grilled Patty', color: '#7a4a30', dark: '#4c2c1c' },
};

// Recipes: what a ticket asks for (a multiset of components), its name and base price.
export const RECIPES = {
  classic: { name: 'Classic Burger', price: 12, items: ['bun', 'patty_cooked', 'lettuce_chopped', 'tomato_chopped'] },
  cheese: { name: 'Cheese Melt', price: 11, items: ['bun', 'patty_cooked', 'cheese'] },
  garden: { name: 'Garden Salad', price: 9, items: ['lettuce_chopped', 'tomato_chopped', 'onion_chopped'] },
  stack: { name: 'Crispy Stack', price: 13, items: ['bun', 'patty_cooked', 'cheese', 'onion_chopped'] },
  golden: { name: 'Golden Melt', price: 13, items: ['bun', 'patty_cooked', 'cheese', 'tomato_chopped'] },
};
export const RECIPE_IDS = Object.keys(RECIPES);

// Stars at the end of the shift, by coins earned.
export const STAR_COIN_LINES = [90, 170, 260];

// Layout of the kitchen, in logical pixels. Crates along the top, work
// counters in the middle row, the pass and the bin at the ends.
export const LAYOUT = {
  hud: { x: 0, y: 0, width: 1280, height: 52 },
  board: { x: 16, y: 60, width: 1248, height: 88 },
  crates: [
    { id: 'crate-tomato', item: 'tomato', x: 24, y: 168, width: 116, height: 80 },
    { id: 'crate-lettuce', item: 'lettuce', x: 154, y: 168, width: 116, height: 80 },
    { id: 'crate-cheese', item: 'cheese', x: 284, y: 168, width: 116, height: 80 },
    { id: 'crate-onion', item: 'onion', x: 414, y: 168, width: 116, height: 80 },
    { id: 'crate-bun', item: 'bun', x: 544, y: 168, width: 116, height: 80 },
    { id: 'crate-patty', item: 'patty', x: 674, y: 168, width: 116, height: 80 },
  ],
  board_station: { id: 'board', x: 24, y: 272, width: 200, height: 104 },
  grill_station: { id: 'grill', x: 260, y: 272, width: 260, height: 104 },
  assembly_station: { id: 'assembly', x: 556, y: 272, width: 340, height: 104 },
  pass_station: { id: 'pass', x: 932, y: 272, width: 190, height: 104 },
  bin_station: { id: 'bin', x: 1158, y: 272, width: 106, height: 104 },
  bottom: { x: 0, y: 656, width: 1280, height: 64 },
};

// The front edge a station is approached from (the chef stands below it).
export function stationFront(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height + 8 };
}
