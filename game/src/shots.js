// shots.js: the screenshot scenes behind ?shot=cover|chop|serve|rush.
// One job: stage a real frame. Each scene plays the rules forward from a fresh
// world with the autopilot (the same bot a player could watch), and stops at the
// first moment the frame shows what the screenshot must show — a kitchen and an
// order board, ingredients on the counter, one dish mid-assembly, a timer and a
// plate ready to serve. The same seed always gives the same frame.

import { matchingTicket } from './orders.js';

const STEP = 1 / 60;

/** Step the world with the autopilot until `until(state)` holds, or `maxSeconds` pass. */
function runUntil(world, maxSeconds, until) {
  const steps = Math.ceil(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.stepBot(STEP);
    if (until && until(world.state)) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * Any unknown name stages the cover: a busy kitchen mid-service.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  state.screen = 'playing';
  if (name === 'chop') {
    // First moment the chef is mid-chop at the board, knife in hand.
    runUntil(world, 90, (s) => s.board.item?.state === 'chopping' && s.board.item.progress >= 1);
    return { screen: 'playing' };
  }
  if (name === 'serve') {
    // First moment the chef carries a finished plate to the pass.
    runUntil(world, 150, (s) => {
      const carry = s.chef.carry;
      if (carry?.kind !== 'plate') return false;
      if (!matchingTicket(s, carry.items)) return false;
      const pass = { x: 1027, y: 384 };
      return Math.hypot(s.chef.x - pass.x, s.chef.y - pass.y) < 150;
    });
    return { screen: 'playing' };
  }
  if (name === 'rush') {
    // The last half-minute: the timer red and pulsing, the board full, a ticket
    // about to run out of patience — and the chef clear of the chopping-board
    // header, so nothing he carries covers a station label.
    runUntil(world, 178, (s) => s.time >= 150
      && s.tickets.some((t) => t.state === 'open' && t.patience / t.patienceMax < 0.5)
      && (s.chef.x > 260 || !s.chef.carry));
    return { screen: 'playing' };
  }
  // Cover: a busy kitchen — several tickets open, a dish mid-assembly on the
  // counter, a patty on the grill and the timer running.
  runUntil(world, 120, (s) => {
    const open = s.tickets.filter((t) => t.state === 'open').length;
    const assembling = (s.plate?.items.length ?? 0) >= 2;
    const grilling = s.grill.some((slot) => slot.item?.state === 'cooking');
    return open >= 3 && assembling && grilling;
  });
  return { screen: 'playing' };
}
