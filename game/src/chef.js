// chef.js: the chef — movement, carrying, and the autopilot.
// One job: where the chef goes and what the hands hold.
// The autopilot plays by the same rules as the player (same interact calls),
// so a staged screenshot is a frame of a real game, never a pose.

import { CHEF_RADIUS, CHEF_SPEED, FLOOR, INGREDIENTS } from './config.js';
import { matchingTicket } from './orders.js';
import { nearestStation, stationById, STATIONS } from './kitchen.js';
import { stationFront } from './config.js';

export function createChef() {
  return {
    x: FLOOR.x + FLOOR.width / 2,
    y: FLOOR.y + FLOOR.height - 60,
    dir: 0, // -1 left, 0 still, 1 right (for the walk bob)
    moving: false,
    carry: null,
    target: null, // { x, y, stationId } — a mouse click or the bot's next stop
  };
}

/** Clamp a point inside the walkable floor. */
function clampToFloor(x, y) {
  return {
    x: Math.min(FLOOR.x + FLOOR.width - CHEF_RADIUS, Math.max(FLOOR.x + CHEF_RADIUS, x)),
    y: Math.min(FLOOR.y + FLOOR.height - CHEF_RADIUS, Math.max(FLOOR.y + CHEF_RADIUS, y)),
  };
}

/**
 * Move the chef for one tick. `input` is { keys: Set, target } where keys holds
 * the held movement keys and target is a click destination (or null).
 * Returns the station the chef arrived at, if a station target was reached.
 */
export function moveChef(state, dt, input) {
  const chef = state.chef;
  let vx = 0;
  let vy = 0;
  const keys = input.keys ?? new Set();
  if (keys.has('left')) vx -= 1;
  if (keys.has('right')) vx += 1;
  if (keys.has('up')) vy -= 1;
  if (keys.has('down')) vy += 1;
  if (vx !== 0 || vy !== 0) {
    chef.target = null; // Keys override a click destination.
    const length = Math.hypot(vx, vy);
    vx /= length;
    vy /= length;
  } else {
    // The destination comes from the input (the bot's next stop, or the
    // click target the player set); fall back to the stored one.
    const target = input.target ?? chef.target;
    if (target) {
      chef.target = target;
      const dx = target.x - chef.x;
      const dy = target.y - chef.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 6) {
        const arrived = target.stationId ?? null;
        chef.target = null;
        chef.moving = false;
        return arrived;
      }
      vx = dx / distance;
      vy = dy / distance;
    }
  }
  chef.moving = vx !== 0 || vy !== 0;
  if (vx !== 0) chef.dir = vx > 0 ? 1 : -1;
  const next = clampToFloor(chef.x + vx * CHEF_SPEED * dt, chef.y + vy * CHEF_SPEED * dt);
  chef.x = next.x;
  chef.y = next.y;
  return null;
}

/** True when the chef stands close enough to work a station. */
export function nearStation(state, stationId) {
  const station = stationById(stationId);
  if (!station) return false;
  const front = stationFront(station);
  return Math.hypot(state.chef.x - front.x, state.chef.y - front.y) < 110;
}

/** The station the chef should walk to (its front edge), as a move target. */
export function goToStation(stationId) {
  const station = stationById(stationId);
  if (!station) return null;
  const front = stationFront(station);
  return { x: front.x, y: front.y, stationId };
}

// ---- The autopilot: a greedy cook that always works the oldest ticket. ----

/** Components of `ticket` the plate does not hold yet (multiset difference). */
function missingComponents(plateItems, ticketItems) {
  const left = [...ticketItems];
  for (const item of plateItems) {
    const at = left.indexOf(item);
    if (at !== -1) left.splice(at, 1);
  }
  return left;
}

/** Where a raw ingredient lives, by its crate station id. */
function crateFor(rawId) {
  return `crate-${rawId}`;
}

/** The raw id behind a finished component (tomato_chopped -> tomato). */
function rawFor(componentId) {
  for (const [rawId, def] of Object.entries(INGREDIENTS)) {
    if (def.chopped === componentId || def.cooked === componentId) return rawId;
  }
  return componentId;
}

/** The bot's next move for one missing component. */
function fetchComponent(state, need) {
  const chef = state.chef;
  const rawId = rawFor(need);
  const def = INGREDIENTS[rawId];
  if (def?.process === 'chop') {
    const board = state.board.item;
    if (board && board.id === rawId && board.state === 'chopped') {
      return { target: goToStation('board'), interact: true };
    }
    if (board && board.id === rawId && board.state === 'chopping') {
      return { target: goToStation('board'), interact: true };
    }
    if (!board && chef.carry?.kind === 'ingredient' && chef.carry.id === rawId && chef.carry.state === 'raw') {
      return { target: goToStation('board'), interact: true };
    }
    if (!board && !chef.carry) {
      return { target: goToStation(crateFor(rawId)), interact: true };
    }
    return { target: goToStation('board'), interact: false }; // Board busy: wait by it.
  }
  if (def?.process === 'grill') {
    const cooked = state.grill.find((s) => s.item && s.item.state === 'done');
    if (cooked) return { target: goToStation('grill'), interact: true };
    const free = state.grill.find((s) => s.item === null);
    if (free && !chef.carry) {
      return { target: goToStation(crateFor(rawId)), interact: true };
    }
    if (free && chef.carry?.kind === 'ingredient' && chef.carry.id === rawId) {
      return { target: goToStation('grill'), interact: true };
    }
    return { target: goToStation('grill'), interact: false }; // Patties cooking: wait.
  }
  // Ready as-is: fetch it from its crate.
  return { target: goToStation(crateFor(rawId)), interact: true };
}

/**
 * The bot's input for this tick: { keys, target, interact }.
 * `interact` is true when the bot stands at its target station and should work it.
 * The bot clears finished work nobody wants (to the bin) so a changed order
 * can never leave it waiting at a blocked station.
 */
export function botInput(state) {
  const chef = state.chef;
  const idle = { keys: new Set(), target: null, interact: false };
  const ticket = state.tickets.find((t) => t.state === 'open');
  const to = (stationId) => ({ keys: new Set(), target: goToStation(stationId), interact: nearStation(state, stationId) });
  const centre = { x: FLOOR.x + FLOOR.width / 2, y: FLOOR.y + FLOOR.height / 2 };

  // Carrying a plate: serve it when it matches, bin it when it can never match,
  // else put it back on the counter and fetch what it still needs.
  if (chef.carry?.kind === 'plate') {
    if (!ticket) return to('assembly');
    if (matchingTicket(state, chef.carry.items)) return to('pass');
    if (missingComponents(chef.carry.items, ticket.items).length === 0) return to('bin');
    return to('assembly');
  }
  // Carrying an ingredient: take it where it belongs, or bin it when no open
  // order wants its finished form any more.
  if (chef.carry?.kind === 'ingredient') {
    const item = chef.carry;
    if (item.state === 'burnt') return to('bin');
    const finished = item.state === 'raw' ? finishedIdFor(item.id) : item.id;
    const wanted = ticket && state.plate && missingComponents(state.plate.items, ticket.items).includes(finished);
    if (ticket && !wanted && state.plate) return to('bin');
    if (item.state === 'raw') {
      const def = INGREDIENTS[item.id];
      if (def?.process === 'chop') return to('board');
      if (def?.process === 'grill') return to('grill');
    }
    if (!ticket) return to('bin');
    return to('assembly');
  }
  // Hands empty and no open ticket: drift to the middle of the kitchen.
  if (!ticket) {
    const distance = Math.hypot(chef.x - centre.x, chef.y - centre.y);
    if (distance > 30) return { keys: new Set(), target: centre, interact: false };
    return idle;
  }
  // Hands empty: work the oldest ticket.
  if (state.plate) {
    const missing = missingComponents(state.plate.items, ticket.items);
    if (missing.length === 0) return to('assembly'); // Plate complete: pick it up.
    // Clear a burnt patty before anything else: it blocks a grill slot.
    if (state.grill.some((s) => s.item?.state === 'burnt')) return to('grill');
    // Collect finished work that is waiting, wanted or not (unwanted goes to the bin).
    if (state.board.item?.state === 'chopped') return to('board');
    if (state.grill.some((s) => s.item?.state === 'done')) return to('grill');
    const step = fetchComponent(state, missing[0]);
    if (!step.target) return idle;
    return { keys: new Set(), target: step.target, interact: step.interact && nearStation(state, step.target.stationId) };
  }
  // No plate on the counter: go and take it.
  return to('assembly');
}

/** The finished component id a raw ingredient becomes (chop or grill). */
function finishedIdFor(rawId) {
  const def = INGREDIENTS[rawId];
  if (!def) return rawId;
  if (def.process === 'chop') return def.chopped;
  if (def.process === 'grill') return def.cooked;
  return rawId;
}

/** Re-export for the renderer's station highlight. */
export { nearestStation, STATIONS };
