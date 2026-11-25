// kitchen.js: the stations and what happens at them. One job: interaction rules.
// Every interaction goes through interact(state, stationId) — the player, the mouse
// and the autopilot all use this one function, so a screenshot stages a real game.

import { CHOPS_NEEDED, GRILL_SECONDS, INGREDIENTS, INTERACT_RANGE, LAYOUT, OVERCOOK_SECONDS, stationFront } from './config.js';
import { matchingTicket, serveValue } from './orders.js';

/** All stations, in the order the game lists them. */
export const STATIONS = [
  ...LAYOUT.crates.map((c) => ({ ...c, kind: 'crate', name: INGREDIENTS[c.item].name })),
  { ...LAYOUT.board_station, kind: 'board', name: 'Chopping Board' },
  { ...LAYOUT.grill_station, kind: 'grill', name: 'Grill' },
  { ...LAYOUT.assembly_station, kind: 'assembly', name: 'Assembly Counter' },
  { ...LAYOUT.pass_station, kind: 'pass', name: 'Serving Pass' },
  { ...LAYOUT.bin_station, kind: 'bin', name: 'Bin' },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) ?? null;
}

/** The station whose front the chef stands close to, or null. */
export function nearestStation(state) {
  const chef = state.chef;
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const front = stationFront(station);
    const dx = chef.x - front.x;
    const dy = chef.y - front.y;
    const distance = Math.hypot(dx, dy);
    if (distance < INTERACT_RANGE && distance < bestDistance) {
      best = station;
      bestDistance = distance;
    }
  }
  return best;
}

/** A raw ingredient's finished component id after its process, or itself when ready. */
export function finishedId(rawId) {
  const def = INGREDIENTS[rawId];
  if (!def) return rawId;
  if (def.process === 'chop') return def.chopped;
  if (def.process === 'grill') return def.cooked;
  return rawId;
}

/**
 * What the chef's hands hold. Either null, an ingredient
 * { kind: 'ingredient', id, state: 'raw'|'chopped'|'cooked'|'burnt' },
 * or a plate { kind: 'plate', items: [component ids] }.
 */
function rawIngredient(id) {
  return { kind: 'ingredient', id, state: 'raw' };
}

/** Push an event the frame loop turns into sound, particles and floating text. */
function emit(state, event) {
  state.events.push(event);
  if (state.events.length > 200) state.events.splice(0, state.events.length - 200);
}

function interactCrate(state, station) {
  const chef = state.chef;
  if (chef.carry) return;
  chef.carry = rawIngredient(station.item);
  emit(state, { type: 'pickup', item: station.item, x: chef.x, y: chef.y - 30 });
}

function interactBoard(state) {
  const chef = state.chef;
  const board = state.board;
  if (!board.item && chef.carry?.kind === 'ingredient') {
    const def = INGREDIENTS[chef.carry.id];
    if (chef.carry.state === 'raw' && def?.process === 'chop') {
      board.item = { id: chef.carry.id, state: 'chopping', progress: 0 };
      chef.carry = null;
      emit(state, { type: 'putdown', x: chef.x, y: chef.y - 30 });
    }
    return;
  }
  if (board.item && !chef.carry) {
    if (board.item.state === 'chopping') {
      board.item.progress += 1;
      emit(state, { type: 'chop', x: chef.x, y: chef.y - 30 });
      if (board.item.progress >= CHOPS_NEEDED) {
        board.item = { id: finishedId(board.item.id), state: 'chopped', progress: CHOPS_NEEDED };
        emit(state, { type: 'chopped', x: chef.x, y: chef.y - 30 });
      }
      return;
    }
    if (board.item.state === 'chopped') {
      chef.carry = { kind: 'ingredient', id: board.item.id, state: 'chopped' };
      board.item = null;
      emit(state, { type: 'pickup', item: chef.carry.id, x: chef.x, y: chef.y - 30 });
    }
  }
}

function interactGrill(state) {
  const chef = state.chef;
  const grill = state.grill;
  if (chef.carry?.kind === 'ingredient' && chef.carry.id === 'patty' && chef.carry.state === 'raw') {
    const slot = grill.find((s) => s.item === null);
    if (slot) {
      slot.item = { id: 'patty', state: 'cooking', progress: 0 };
      chef.carry = null;
      emit(state, { type: 'grill-start', x: chef.x, y: chef.y - 30 });
    }
    return;
  }
  if (!chef.carry) {
    const ready = grill.find((s) => s.item && (s.item.state === 'done' || s.item.state === 'burnt'));
    if (ready) {
      const picked = ready.item.state;
      chef.carry = { kind: 'ingredient', id: 'patty_cooked', state: picked === 'burnt' ? 'burnt' : 'cooked' };
      ready.item = null;
      emit(state, { type: 'pickup', item: chef.carry.id, x: chef.x, y: chef.y - 30 });
    }
  }
}

/** True when some open ticket still needs `component` beyond what the plate holds. */
function plateAccepts(state, component) {
  for (const ticket of state.tickets) {
    if (ticket.state !== 'open') continue;
    const needed = [...ticket.items];
    for (const item of state.plate.items) {
      const at = needed.indexOf(item);
      if (at !== -1) needed.splice(at, 1);
    }
    if (needed.includes(component)) return true;
  }
  return false;
}

function interactAssembly(state) {
  const chef = state.chef;
  if (chef.carry?.kind === 'plate') {
    if (!state.plate) {
      state.plate = chef.carry;
      chef.carry = null;
      emit(state, { type: 'putdown', x: chef.x, y: chef.y - 30 });
    }
    return;
  }
  if (chef.carry?.kind === 'ingredient') {
    const item = chef.carry;
    if (!state.plate) return; // No plate on the counter: fetch the plate first.
    if (item.state === 'burnt') return; // Burnt food never goes on a plate.
    const component = item.state === 'raw' ? finishedId(item.id) : item.id;
    const ready = item.state === 'chopped' || item.state === 'cooked' || INGREDIENTS[item.id]?.process === 'none';
    if (!ready) return; // Raw food that still needs work cannot be plated.
    if (!plateAccepts(state, component)) {
      // No open order wants this on the plate: refuse it rather than poison the dish.
      emit(state, { type: 'wrong', x: chef.x, y: chef.y - 30 });
      return;
    }
    state.plate.items.push(component);
    chef.carry = null;
    emit(state, { type: 'add', item: component, x: chef.x, y: chef.y - 30 });
    return;
  }
  if (!chef.carry && state.plate) {
    chef.carry = state.plate;
    state.plate = null;
    emit(state, { type: 'pickup', item: 'plate', x: chef.x, y: chef.y - 30 });
  }
}

function interactPass(state) {
  const chef = state.chef;
  if (chef.carry?.kind !== 'plate') return;
  const ticket = matchingTicket(state, chef.carry.items);
  if (!ticket) {
    emit(state, { type: 'wrong', x: chef.x, y: chef.y - 30 });
    return;
  }
  const value = serveValue(state, ticket);
  ticket.state = 'done';
  ticket.age = 0;
  state.coins += value.coins;
  state.served += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.lastServeAt = state.time;
  chef.carry = null;
  state.plateRespawn = 1;
  emit(state, { type: 'serve', ticket, coins: value.coins, tip: value.tip, x: chef.x, y: chef.y - 30 });
}

function interactBin(state) {
  const chef = state.chef;
  if (chef.carry?.kind === 'ingredient') {
    chef.carry = null;
    emit(state, { type: 'bin', x: chef.x, y: chef.y - 30 });
    return;
  }
  if (chef.carry?.kind === 'plate') {
    chef.carry.items = [];
    emit(state, { type: 'bin', x: chef.x, y: chef.y - 30 });
  }
}

/** Run one interaction at a station. Unknown stations and full hands are no-ops. */
export function interact(state, stationId) {
  const station = stationById(stationId);
  if (!station || state.screen !== 'playing') return;
  switch (station.kind) {
    case 'crate': interactCrate(state, station); break;
    case 'board': interactBoard(state); break;
    case 'grill': interactGrill(state); break;
    case 'assembly': interactAssembly(state); break;
    case 'pass': interactPass(state); break;
    case 'bin': interactBin(state); break;
    default: break;
  }
}

/** Advance the grill and the plate respawn while the shift runs. */
export function updateKitchen(state, dt) {
  if (state.screen !== 'playing') return;
  for (const slot of state.grill) {
    const item = slot.item;
    if (!item) continue;
    if (item.state === 'cooking') {
      item.progress += dt / GRILL_SECONDS;
      if (item.progress >= 1) {
        item.state = 'done';
        item.progress = 1;
        item.overcook = 0;
        emit(state, { type: 'grill-done', x: 390, y: 300 });
      }
    } else if (item.state === 'done') {
      item.overcook = (item.overcook ?? 0) + dt;
      if (item.overcook >= OVERCOOK_SECONDS) {
        item.state = 'burnt';
        emit(state, { type: 'burnt', x: 390, y: 300 });
      }
    }
  }
  if (state.plateRespawn > 0) {
    state.plateRespawn -= dt;
    if (state.plateRespawn <= 0 && !state.plate) {
      state.plate = { kind: 'plate', items: [] };
    }
  }
}
