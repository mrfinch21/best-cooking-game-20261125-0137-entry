// orders.js: the order board. One job: tickets — spawn, patience, match, expire.
// A ticket asks for one recipe. Serving a plate whose components match the recipe
// (as a multiset, order-free) earns the dish price plus a patience tip.

import { MAX_TICKETS, PATIENCE_END_SECONDS, PATIENCE_START_SECONDS, RECIPES, RECIPE_IDS, SHIFT_SECONDS, SPAWN_END_SECONDS, SPAWN_FIRST_SECONDS, SPAWN_START_SECONDS } from './config.js';
import { pick } from './random.js';

let ticketCounter = 0;

/** How long the shift has run, as a fraction 0..1 (for the difficulty ramp). */
function progress(state) {
  return Math.min(1, state.time / SHIFT_SECONDS);
}

/** Seconds until the next order spawns, shrinking as the shift wears on. */
export function spawnInterval(state) {
  const p = progress(state);
  return SPAWN_START_SECONDS + (SPAWN_END_SECONDS - SPAWN_START_SECONDS) * p;
}

/** A fresh ticket's patience in seconds, shrinking as the shift wears on. */
export function patienceFor(state) {
  const p = progress(state);
  return PATIENCE_START_SECONDS + (PATIENCE_END_SECONDS - PATIENCE_START_SECONDS) * p;
}

export function makeTicket(state) {
  const recipeId = pick(state.rng, RECIPE_IDS);
  const patience = patienceFor(state);
  ticketCounter += 1;
  return {
    id: ticketCounter,
    recipeId,
    name: RECIPES[recipeId].name,
    price: RECIPES[recipeId].price,
    items: [...RECIPES[recipeId].items],
    patience,
    patienceMax: patience,
    state: 'open',
  };
}

/** Spawn tickets on schedule while the shift runs. */
export function updateOrders(state, dt) {
  if (state.screen !== 'playing') return;
  state.spawnTimer -= dt;
  const open = state.tickets.filter((t) => t.state === 'open').length;
  if (state.spawnTimer <= 0 && open < MAX_TICKETS) {
    state.tickets.push(makeTicket(state));
    state.spawnTimer = spawnInterval(state);
  }
  for (const ticket of state.tickets) {
    if (ticket.state !== 'open') continue;
    ticket.patience -= dt;
    if (ticket.patience <= 0) {
      ticket.state = 'lost';
      ticket.patience = 0;
      state.lost += 1;
      state.combo = 0;
      state.events.push({ type: 'order-lost', ticket });
    }
  }
  // Drop finished tickets once their pop animation has had a moment.
  state.tickets = state.tickets.filter((t) => t.state === 'open' || (t.age ?? 0) < 1.2);
  for (const ticket of state.tickets) {
    if (ticket.state !== 'open') ticket.age = (ticket.age ?? 0) + dt;
  }
  if (state.tickets.filter((t) => t.state === 'open').length === 0 && state.spawnTimer <= 0) {
    state.spawnTimer = Math.min(state.spawnTimer + 2, spawnInterval(state));
  }
}

/** True when the plate's components are exactly the ticket's recipe. */
export function plateMatchesTicket(plateItems, ticket) {
  if (plateItems.length !== ticket.items.length) return false;
  const left = [...ticket.items];
  for (const item of plateItems) {
    const at = left.indexOf(item);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return left.length === 0;
}

/** The open ticket a plate would satisfy, or null. */
export function matchingTicket(state, plateItems) {
  for (const ticket of state.tickets) {
    if (ticket.state === 'open' && plateMatchesTicket(plateItems, ticket)) return ticket;
  }
  return null;
}

/** Coins for serving `ticket` now: base price + patience tip, times the combo multiplier. */
export function serveValue(state, ticket) {
  const patienceFraction = Math.max(0, ticket.patience / ticket.patienceMax);
  const tip = Math.round(6 * patienceFraction);
  const multiplier = 1 + 0.1 * Math.min(state.combo, 10);
  return { coins: Math.round((ticket.price + tip) * multiplier), tip, multiplier };
}

/** Reset the ticket counter (a fresh game reuses ticket ids from 1). */
export function resetTicketCounter() {
  ticketCounter = 0;
}
