// input.js: keyboard and mouse. One job: turn presses and clicks into game input.
// Movement keys feed a held set; action keys call hooks once per press (no repeats).
// A click on a station becomes a walk-to target; a click elsewhere is a walk target.

import { VIEW } from './config.js';

const KEY_DIRECTIONS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

/** Logical canvas coordinates for a pointer event (the canvas is scaled to fit). */
function toLogical(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
  const offsetX = (rect.width - VIEW.width * scale) / 2;
  const offsetY = (rect.height - VIEW.height * scale) / 2;
  return {
    x: (event.clientX - rect.left - offsetX) / scale,
    y: (event.clientY - rect.top - offsetY) / scale,
  };
}

/**
 * Wire the canvas and keyboard. `hooks` is { onStart, onInteract, onPause,
 * onRestart, onMute, onClickPoint(x, y) }. Returns { keys, destroy }.
 */
export function createInput(canvas, hooks) {
  const keys = new Set();

  function onKeyDown(event) {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      keys.add(direction);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    switch (event.code) {
      case 'Enter': hooks.onStart?.(); break;
      case 'KeyE': case 'Space': hooks.onInteract?.(); event.preventDefault(); break;
      case 'KeyM': hooks.onMute?.(); break;
      case 'KeyP': hooks.onPause?.(); break;
      case 'KeyR': hooks.onRestart?.(); break;
      default: break;
    }
  }

  function onKeyUp(event) {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) keys.delete(direction);
  }

  function onPointerDown(event) {
    const point = toLogical(canvas, event);
    hooks.onClickPoint?.(point.x, point.y);
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    keys,
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
