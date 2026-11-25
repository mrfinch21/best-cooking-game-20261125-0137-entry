// main.js: the game itself. One job: own the state, run the loop, and wire
// input, kitchen, orders, sound and rendering together.
// The world object is what the screenshot stager drives: reset it, step it
// with the autopilot, and it plays a real shift.

import { sfx, toggleMute, unlockAudio } from './audio.js';
import { botInput, createChef, moveChef, nearStation } from './chef.js';
import { COMBO_WINDOW_SECONDS, SHIFT_SECONDS, SPAWN_FIRST_SECONDS, VIEW } from './config.js';
import { createInput } from './input.js';
import { interact, nearestStation, stationById, updateKitchen } from './kitchen.js';
import { updateOrders } from './orders.js';
import { burst, floatText, updateParticles } from './particles.js';
import { makeRng } from './random.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

/** A fresh shift. `seed` fixes the orders, so one seed always plays the same. */
export function createState(seed) {
  return {
    seed,
    rng: makeRng(seed),
    screen: 'title', // title | playing | paused | over
    time: 0,
    animTime: 0,
    chef: createChef(),
    tickets: [],
    board: { item: null },
    grill: [{ item: null }, { item: null }],
    plate: { kind: 'plate', items: [] },
    plateRespawn: 0,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    lastServeAt: -999,
    spawnTimer: SPAWN_FIRST_SECONDS,
    particles: [],
    floats: [],
    events: [],
    muted: false,
    bestCoins: 0,
    lastTickSecond: -1,
  };
}

/** Turn a frame's events into sound, particles and floating text. */
function drainEvents(state) {
  for (const event of state.events) {
    switch (event.type) {
      case 'pickup': sfx.pickup(); break;
      case 'putdown': sfx.putdown(); break;
      case 'chop':
        sfx.chop();
        burst(state, state.chef.x, state.chef.y - 40, 'chop');
        break;
      case 'chopped': sfx.chopped(); break;
      case 'grill-start': sfx.sizzle(); break;
      case 'grill-done':
        sfx.grillDone();
        burst(state, event.x, event.y, 'steam');
        break;
      case 'burnt':
        sfx.burnt();
        burst(state, event.x, event.y, 'smoke');
        floatText(state, event.x, event.y - 20, 'BURNT!', '#ff9a8a');
        break;
      case 'add':
        sfx.putdown();
        burst(state, event.x, event.y - 30, 'sparkle');
        break;
      case 'serve':
        sfx.serve();
        sfx.coin();
        burst(state, event.x, event.y - 40, 'sparkle');
        floatText(state, event.x, event.y - 70, `+$${event.coins}`, '#ffd34d');
        if (event.tip > 0) floatText(state, event.x, event.y - 96, `tip $${event.tip}`, '#b8f0b0');
        break;
      case 'wrong':
        sfx.wrong();
        floatText(state, event.x, event.y - 60, 'No order for that!', '#ff9a8a');
        break;
      case 'bin': sfx.putdown(); break;
      case 'order-lost':
        sfx.lost();
        floatText(state, 640, 120, `Lost order: ${event.ticket.name}`, '#ff9a8a');
        break;
      default: break;
    }
  }
  state.events.length = 0;
}

/**
 * One tick of the shift. `input` is { keys, target, interact, interactPressed }.
 * The bot and the player both drive through here.
 */
export function stepWorld(state, dt, input) {
  state.animTime += dt;
  if (state.screen !== 'playing') {
    updateParticles(state, dt);
    return;
  }
  state.time += dt;
  updateOrders(state, dt);
  updateKitchen(state, dt);

  // Combo fades when too long passes between serves.
  if (state.combo > 0 && state.time - state.lastServeAt > COMBO_WINDOW_SECONDS) state.combo = 0;

  // Move, then work whatever station was reached or pressed.
  const arrived = moveChef(state, dt, input);
  if (input.interact && input.target?.stationId && nearStation(state, input.target.stationId)) {
    interact(state, input.target.stationId);
  } else if (arrived) {
    interact(state, arrived);
  }
  if (input.interactPressed) {
    const near = nearestStation(state);
    if (near) interact(state, near.id);
  }

  // The last ten seconds tick, so the timer can be felt.
  const whole = Math.ceil(SHIFT_SECONDS - state.time);
  if (whole !== state.lastTickSecond) {
    state.lastTickSecond = whole;
    if (whole <= 10 && whole > 0) sfx.tick();
  }

  if (state.time >= SHIFT_SECONDS) {
    state.screen = 'over';
    state.bestCoins = Math.max(state.bestCoins, state.coins);
    sfx.end();
  }
  updateParticles(state, dt);
  drainEvents(state);
}

/** The world: state plus the operations the loop and the stager call. */
export function createWorld(seed) {
  let state = createState(seed);
  const world = {
    get state() { return state; },
    reset() { state = createState(seed); },
    step(dt, input) { stepWorld(state, dt, input); },
    stepBot(dt) { stepWorld(state, dt, botInput(state)); },
    interact(stationId) { interact(state, stationId); },
  };
  return world;
}

/** Start the shift from the title screen. */
function startShift(world) {
  const best = world.state.bestCoins;
  world.reset();
  world.state.bestCoins = best;
  world.state.screen = 'playing';
  unlockAudio();
  sfx.start();
}

/** Boot the game on `canvas`. Returns the world, for tests and screenshots. */
export function boot(canvas) {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') ?? 1) || 1;
  const shot = params.get('shot');
  const ctx = canvas.getContext('2d');
  const world = createWorld(seed);

  if (shot) {
    // Screenshot mode: stage one real frame, draw it once, and stop.
    // The page sets window.__shotReady so the capture script knows it is done.
    stageShot(shot, world);
    render(ctx, world.state);
    window.__shotReady = true;
    window.__game = world;
    return world;
  }

  let interactPressed = false;
  const input = createInput(canvas, {
    onStart() {
      if (world.state.screen === 'title') startShift(world);
    },
    onInteract() {
      if (world.state.screen === 'playing') interactPressed = true;
      unlockAudio();
    },
    onPause() {
      if (world.state.screen === 'playing') world.state.screen = 'paused';
      else if (world.state.screen === 'paused') world.state.screen = 'playing';
    },
    onRestart() {
      if (world.state.screen === 'over' || world.state.screen === 'paused') startShift(world);
    },
    onMute() {
      world.state.muted = toggleMute();
    },
    onClickPoint(x, y) {
      unlockAudio();
      if (world.state.screen === 'title') {
        startShift(world);
        return;
      }
      if (world.state.screen !== 'playing') return;
      // A click on a station walks the chef to its front; anywhere else walks
      // the chef to that spot. Arriving at a station works it.
      let target = { x, y, stationId: null };
      for (const station of [stationById('board'), stationById('grill'), stationById('assembly'), stationById('pass'), stationById('bin')]) {
        if (!station) continue;
        if (x >= station.x - 6 && x <= station.x + station.width + 6 && y >= station.y - 6 && y <= station.y + station.height + 6) {
          target = { x: station.x + station.width / 2, y: station.y + station.height + 8, stationId: station.id };
        }
      }
      for (const crate of ['crate-tomato', 'crate-lettuce', 'crate-cheese', 'crate-onion', 'crate-bun', 'crate-patty']) {
        const station = stationById(crate);
        if (station && x >= station.x - 6 && x <= station.x + station.width + 6 && y >= station.y - 6 && y <= station.y + station.height + 6) {
          target = { x: station.x + station.width / 2, y: station.y + station.height + 8, stationId: station.id };
        }
      }
      world.state.chef.target = target;
      const near = nearestStation(world.state);
      if (near && target.stationId === near.id) interact(world.state, near.id);
    },
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const frameInput = { keys: input.keys, target: world.state.chef.target, interact: false, interactPressed };
    interactPressed = false;
    stepWorld(world.state, dt, frameInput);
    render(ctx, world.state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__game = world;
  return world;
}

// The page's entry point: the canvas fills the window, the game scales to fit.
// Guarded so the module also imports in Node (for headless logic tests).
if (typeof document !== 'undefined') {
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.width = VIEW.width;
    canvas.height = VIEW.height;
    boot(canvas);
  }
}
