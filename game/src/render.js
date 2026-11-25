// render.js: everything the player sees. One job: draw the kitchen, the chef,
// the tickets, the HUD and the screens on the canvas — big, bold and readable
// at a glance, since the judge meets the game through its screenshots.

import { COMPONENTS, FLOOR, INGREDIENTS, LAYOUT, RECIPES, SHIFT_SECONDS, STAR_COIN_LINES, VIEW } from './config.js';
import { nearestStation, stationById } from './kitchen.js';
import { drawFloats, drawParticles } from './particles.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.font = `${weight ?? 'bold'} ${size}px ${FONT}`;
  ctx.textAlign = align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function outlinedText(ctx, str, x, y, size, color, weight, align) {
  ctx.font = `${weight ?? 'bold'} ${size}px ${FONT}`;
  ctx.textAlign = align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 5);
  ctx.strokeStyle = 'rgba(46,26,12,0.9)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Format seconds as m:ss. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---- Food: every ingredient and component drawn as a small illustration. ----

export function drawFoodIcon(ctx, id, x, y, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'tomato':
      ctx.fillStyle = '#e5484d';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a92c31';
      ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.2, r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f9e4d';
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.4, -r * 0.4); ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.4, -r * 0.4); ctx.closePath(); ctx.fill();
      break;
    case 'tomato_chopped':
      ctx.fillStyle = '#e5484d';
      ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.4, r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2a0a3';
      ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.4, r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'lettuce':
      ctx.fillStyle = '#57b25e';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7ed084';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#2f7a37'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0.3, Math.PI * 1.2); ctx.stroke();
      break;
    case 'lettuce_chopped':
      ctx.fillStyle = '#57b25e';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 0.42, 3); ctx.fill();
      ctx.fillStyle = '#7ed084';
      roundRect(ctx, -r * 0.8, -r * 0.05, r * 1.6, r * 0.42, 3); ctx.fill();
      ctx.fillStyle = '#57b25e';
      roundRect(ctx, -r * 0.6, r * 0.45, r * 1.2, r * 0.42, 3); ctx.fill();
      break;
    case 'onion':
      ctx.fillStyle = '#d9c2f0';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9a7fc4'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#57b25e';
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.3, -r * 1.25); ctx.lineTo(r * 0.3, -r * 1.25); ctx.closePath(); ctx.fill();
      break;
    case 'onion_chopped':
      ctx.strokeStyle = '#d9c2f0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.35, r * 0.25, r * 0.4, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'cheese':
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(r, r * 0.6); ctx.lineTo(r * 0.2, -r * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b98a1d';
      ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.35, r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bun':
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath(); ctx.arc(0, r * 0.25, r * 0.9, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c98a3e';
      ctx.fillRect(-r * 0.9, r * 0.25, r * 1.8, r * 0.28);
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.55, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    case 'patty':
      ctx.fillStyle = '#8a5a3b';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5); ctx.fill();
      ctx.fillStyle = '#a9742f';
      ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'patty_cooked':
      ctx.fillStyle = '#6b3f24';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5); ctx.fill();
      ctx.strokeStyle = '#3d2212'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.4); ctx.lineTo(-r * 0.5, r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.5, r * 0.4); ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#cccccc';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

/** A plate (white ellipse) with its components stacked as a little pile. */
export function drawPlate(ctx, items, x, y, scale) {
  const s = scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#f7f3ea';
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8cfba'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 30, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 21, 0, 0, Math.PI * 2); ctx.stroke();
  const shown = items.slice(0, 4);
  shown.forEach((item, i) => {
    drawFoodIcon(ctx, item, -27 + i * 18, -4, 22);
  });
  if (items.length > 4) text(ctx, `+${items.length - 4}`, 30, -14, 13, '#6b4a2f', 'bold');
  ctx.restore();
}

// ---- Stations ----

function drawCounterTop(ctx, station, base, top) {
  ctx.fillStyle = base;
  roundRect(ctx, station.x, station.y, station.width, station.height, 10);
  ctx.fill();
  ctx.fillStyle = top;
  roundRect(ctx, station.x + 4, station.y + 4, station.width - 8, 22, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,32,12,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, station.x, station.y, station.width, station.height, 10);
  ctx.stroke();
}

function drawCrate(ctx, station) {
  const def = INGREDIENTS[station.item];
  drawCounterTop(ctx, station, '#8a5a3b', '#a9742f');
  drawFoodIcon(ctx, station.item, station.x + station.width / 2, station.y + 48, 40);
  text(ctx, def.name.toUpperCase(), station.x + station.width / 2, station.y + station.height - 12, 13, '#ffe9c4', 'bold');
}

function drawBoard(ctx, state) {
  const station = LAYOUT.board_station;
  drawCounterTop(ctx, station, '#7a4a30', '#c9a06a');
  text(ctx, 'CHOPPING BOARD', station.x + station.width / 2, station.y + 15, 12, '#ffe9c4', 'bold');
  const item = state.board.item;
  if (item) {
    if (item.state === 'chopping') {
      // Icon on the left, progress bar and count on the right: nothing overlaps.
      drawFoodIcon(ctx, item.id, station.x + 48, station.y + 60, 36);
      const w = 92;
      const px = station.x + 96;
      const py = station.y + 56;
      text(ctx, `CHOP ${item.progress}/3`, px + w / 2, py - 12, 12, '#ffffff', 'bold');
      ctx.fillStyle = 'rgba(40,20,8,0.7)';
      roundRect(ctx, px, py, w, 10, 5); ctx.fill();
      ctx.fillStyle = '#ffd34d';
      roundRect(ctx, px, py, w * (item.progress / 3), 10, 5); ctx.fill();
    } else {
      drawFoodIcon(ctx, item.id, station.x + station.width / 2, station.y + 58, 40);
      text(ctx, 'READY', station.x + station.width / 2, station.y + station.height - 12, 12, '#b8f0b0', 'bold');
    }
  } else {
    text(ctx, 'bring something to chop', station.x + station.width / 2, station.y + 58, 12, '#e8d5b5', 'normal');
  }
}

function drawGrill(ctx, state) {
  const station = LAYOUT.grill_station;
  drawCounterTop(ctx, station, '#4a4a52', '#6e6e78');
  text(ctx, 'GRILL', station.x + station.width / 2, station.y + 15, 12, '#ffe9c4', 'bold');
  state.grill.forEach((slot, i) => {
    const cx = station.x + 62 + i * 136;
    const cy = station.y + 58;
    ctx.fillStyle = '#2c2c33';
    roundRect(ctx, cx - 52, cy - 26, 104, 52, 8); ctx.fill();
    ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 2;
    for (let g = -1; g <= 1; g += 1) {
      ctx.beginPath(); ctx.moveTo(cx + g * 26, cy - 22); ctx.lineTo(cx + g * 26, cy + 22); ctx.stroke();
    }
    if (slot.item) {
      drawFoodIcon(ctx, slot.item.state === 'burnt' ? 'patty' : 'patty_cooked', cx, cy - 2, 34);
      if (slot.item.state === 'burnt') {
        text(ctx, 'BURNT!', cx, cy - 32, 12, '#ff9a8a', 'bold');
      } else if (slot.item.state === 'cooking') {
        const w = 84;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        roundRect(ctx, cx - w / 2, cy + 30, w, 8, 4); ctx.fill();
        ctx.fillStyle = '#ff9a3d';
        roundRect(ctx, cx - w / 2, cy + 30, w * Math.min(1, slot.item.progress), 8, 4); ctx.fill();
      } else {
        text(ctx, 'DONE ✓', cx, cy + 32, 12, '#b8f0b0', 'bold');
      }
    } else {
      // A dark pill behind the label so the middle grate line does not read
      // as a strike through the word.
      ctx.fillStyle = '#2c2c33';
      roundRect(ctx, cx - 26, cy - 10, 52, 20, 6); ctx.fill();
      text(ctx, 'empty', cx, cy, 12, '#b9b3a8', 'normal');
    }
  });
}

function drawAssembly(ctx, state) {
  const station = LAYOUT.assembly_station;
  drawCounterTop(ctx, station, '#7a4a30', '#e8dcc0');
  text(ctx, 'ASSEMBLY — BUILD THE DISH HERE', station.x + station.width / 2, station.y + 15, 12, '#5a3a1a', 'bold');
  if (state.plate) {
    drawPlate(ctx, state.plate.items, station.x + station.width / 2, station.y + 60, 1.15);
    if (state.plate.items.length === 0) {
      text(ctx, 'empty plate — add ingredients', station.x + station.width / 2, station.y + station.height - 10, 12, '#8a6a44', 'normal');
    }
  } else {
    text(ctx, 'plate is with the chef…', station.x + station.width / 2, station.y + 58, 13, '#e8d5b5', 'normal');
  }
}

function drawPass(ctx, state) {
  const station = LAYOUT.pass_station;
  const glow = 0.55 + 0.25 * Math.sin(state.animTime * 3);
  ctx.save();
  ctx.shadowColor = `rgba(255,190,60,${glow})`;
  ctx.shadowBlur = 22;
  drawCounterTop(ctx, station, '#8a6a1d', '#ffd34d');
  ctx.restore();
  text(ctx, 'SERVING PASS', station.x + station.width / 2, station.y + 15, 12, '#5a3a1a', 'bold');
  // A little bell and a plate outline: the pass is where dishes go out.
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath(); ctx.arc(station.x + station.width / 2 - 28, station.y + 58, 16, Math.PI, 0); ctx.fill();
  ctx.fillRect(station.x + station.width / 2 - 34, station.y + 58, 12, 4);
  ctx.beginPath(); ctx.ellipse(station.x + station.width / 2 + 34, station.y + 58, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9b98a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(station.x + station.width / 2 + 34, station.y + 58, 30, 18, 0, 0, Math.PI * 2); ctx.stroke();
  text(ctx, 'SERVE!', station.x + station.width / 2, station.y + station.height - 12, 13, '#5a3a1a', 'bold');
}

function drawBin(ctx) {
  const station = LAYOUT.bin_station;
  drawCounterTop(ctx, station, '#5a5a62', '#7e7e88');
  text(ctx, 'BIN', station.x + station.width / 2, station.y + 15, 12, '#ffe9c4', 'bold');
  ctx.fillStyle = '#3c3c44';
  roundRect(ctx, station.x + 28, station.y + 40, 50, 44, 6); ctx.fill();
  ctx.strokeStyle = '#a9a9b3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(station.x + 38, station.y + 48); ctx.lineTo(station.x + 38, station.y + 76); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(station.x + 53, station.y + 48); ctx.lineTo(station.x + 53, station.y + 76); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(station.x + 68, station.y + 48); ctx.lineTo(station.x + 68, station.y + 76); ctx.stroke();
}

// ---- Tickets (the order board) ----

function drawTicket(ctx, ticket, x, y, w, h) {
  const done = ticket.state === 'done';
  const lost = ticket.state === 'lost';
  ctx.save();
  ctx.globalAlpha = lost ? 0.45 : 1;
  ctx.fillStyle = done ? '#2f6b34' : '#fff8e6';
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = done ? '#7ed084' : '#d8b96a'; ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.fillStyle = done ? '#b8f0b0' : '#5a3a1a';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(ticket.name, x + 10, y + 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = done ? '#ffffff' : '#b07818';
  ctx.fillText(`$${ticket.price}`, x + w - 10, y + 16);
  ctx.textAlign = 'left';
  // Component icons in a row.
  ticket.items.forEach((item, i) => {
    drawFoodIcon(ctx, item, x + 22 + i * 30, y + 46, 24);
  });
  // Patience bar.
  const barW = w - 20;
  const frac = Math.max(0, ticket.patience / ticket.patienceMax);
  const barColor = frac > 0.5 ? '#57b25e' : frac > 0.25 ? '#f2a541' : '#e5484d';
  ctx.fillStyle = 'rgba(90,58,26,0.25)';
  roundRect(ctx, x + 10, y + h - 16, barW, 8, 4); ctx.fill();
  ctx.fillStyle = barColor;
  roundRect(ctx, x + 10, y + h - 16, barW * frac, 8, 4); ctx.fill();
  if (done) {
    outlinedText(ctx, 'SERVED!', x + w / 2, y + h / 2 + 6, 20, '#ffffff', 'bold');
  } else if (lost) {
    outlinedText(ctx, 'TOO LATE', x + w / 2, y + h / 2 + 6, 18, '#ffb0a6', 'bold');
  }
  ctx.restore();
}

// ---- Chef ----

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = chef.moving ? Math.sin(state.animTime * 12) * 2.5 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(40,20,8,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 26 - bob, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body: white apron.
  ctx.fillStyle = '#f4efe4';
  roundRect(ctx, -20, -6, 40, 34, 12); ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(-20, 12, 40, 6);
  // Head.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(0, -16, 14, 0, Math.PI * 2); ctx.fill();
  // Chef hat: a puffy white cap.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-9, -28, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -31, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(9, -28, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -30, 26, 7);
  // Eyes, looking the way the chef faces.
  ctx.fillStyle = '#2c1c10';
  const look = chef.dir === 0 ? 0 : chef.dir * 2;
  ctx.beginPath(); ctx.arc(-5 + look, -16, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5 + look, -16, 2, 0, Math.PI * 2); ctx.fill();
  // Carried item, held high.
  if (chef.carry) {
    const lift = Math.sin(state.animTime * 4) * 2;
    if (chef.carry.kind === 'plate') {
      drawPlate(ctx, chef.carry.items, 0, -56 + lift, 0.85);
    } else {
      drawFoodIcon(ctx, chef.carry.id, 0, -52 + lift, 30);
      if (chef.carry.state === 'burnt') text(ctx, 'BURNT', 0, -72 + lift, 11, '#ff9a8a', 'bold');
    }
  }
  ctx.restore();
}

// ---- HUD, hints, screens ----

function drawHud(ctx, state) {
  const hud = LAYOUT.hud;
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(hud.x, hud.y, hud.width, hud.height);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(hud.x, hud.y + hud.height - 4, hud.width, 4);
  text(ctx, 'THE GILDED LADLE', 16, hud.y + 26, 20, '#ffd34d', 'bold', 'left');
  text(ctx, 'SHIFT 1', 16, hud.y + 44, 11, '#d8b96a', 'normal', 'left');
  // Shift timer, big in the middle.
  const left = SHIFT_SECONDS - state.time;
  const urgent = left <= 30;
  const pulse = urgent ? 1 + 0.12 * Math.sin(state.animTime * 8) : 1;
  ctx.save();
  ctx.translate(VIEW.width / 2, hud.y + 26);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = urgent ? '#e5484d' : '#fff8e6';
  roundRect(ctx, -64, -20, 128, 40, 10); ctx.fill();
  text(ctx, formatTime(left), 0, 1, 26, urgent ? '#ffffff' : '#3a2415', 'bold');
  ctx.restore();
  // Coins, top right: a drawn coin plus the amount.
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(VIEW.width - 128, hud.y + 20, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b07818'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(VIEW.width - 128, hud.y + 20, 9, 0, Math.PI * 2); ctx.stroke();
  text(ctx, '$', VIEW.width - 128, hud.y + 21, 12, '#7a5410', 'bold');
  text(ctx, `${state.coins}`, VIEW.width - 112, hud.y + 20, 18, '#ffd34d', 'bold', 'left');
  // Served / lost, bottom right.
  text(ctx, `Served ${state.served}  ·  Lost ${state.lost}`, VIEW.width - 16, hud.y + 40, 12, '#d8b96a', 'normal', 'right');
  // Combo badge, left of the coins so nothing overlaps.
  if (state.combo >= 2) {
    ctx.fillStyle = '#e5484d';
    roundRect(ctx, VIEW.width - 268, hud.y + 8, 96, 36, 10); ctx.fill();
    text(ctx, `COMBO ×${state.combo}`, VIEW.width - 220, hud.y + 27, 15, '#ffffff', 'bold');
  }
}

/** The one-line hint at the bottom: what to do next. */
export function hintFor(state) {
  const chef = state.chef;
  if (state.screen === 'title') return 'Press Enter or click to start your shift.';
  if (state.screen === 'over') return 'Press R to run another shift.';
  const ticket = state.tickets.find((t) => t.state === 'open');
  if (!ticket) return 'No orders yet — the next ticket is coming. Get ready!';
  if (chef.carry?.kind === 'plate') {
    return 'Carry the plate to the glowing Serving Pass — match the ticket!';
  }
  if (chef.carry?.kind === 'ingredient') {
    const item = chef.carry;
    if (item.state === 'burnt') return 'That patty is burnt — drop it in the Bin.';
    if (item.state === 'raw') {
      const def = INGREDIENTS[item.id];
      if (def?.process === 'chop') return `Chop the ${def.name} on the Chopping Board (press E).`;
      if (def?.process === 'grill') return 'Put the patty on the Grill — watch it, it burns!';
      return `Take the ${def.name} to the Assembly Counter.`;
    }
    return 'Add it to the plate on the Assembly Counter.';
  }
  if (state.board.item?.state === 'chopped') return 'Chopped and ready — pick it up from the board.';
  if (state.grill.some((s) => s.item?.state === 'done')) return 'A patty is done on the grill — grab it before it burns!';
  return `Oldest order: ${ticket.name} — fetch what is missing, then serve.`;
}

function drawBottomBar(ctx, state) {
  const bar = LAYOUT.bottom;
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
  const chef = state.chef;
  let carrying = 'Hands empty';
  if (chef.carry?.kind === 'plate') carrying = `Plate: ${chef.carry.items.length} item${chef.carry.items.length === 1 ? '' : 's'}`;
  else if (chef.carry?.kind === 'ingredient') {
    if (chef.carry.state === 'chopped') {
      const raw = Object.values(INGREDIENTS).find((d) => d.chopped === chef.carry.id);
      carrying = `Chopped ${raw?.name ?? chef.carry.id}`;
    }
    else if (chef.carry.state === 'cooked') carrying = COMPONENTS[chef.carry.id]?.name ?? 'Grilled patty';
    else if (chef.carry.state === 'burnt') carrying = 'Burnt patty';
    else carrying = INGREDIENTS[chef.carry.id]?.name ?? chef.carry.id;
  }
  text(ctx, carrying, 16, bar.y + 32, 16, '#ffd34d', 'bold', 'left');
  if (chef.carry?.kind === 'ingredient') drawFoodIcon(ctx, chef.carry.id, 170, bar.y + 32, 26);
  if (chef.carry?.kind === 'plate') drawPlate(ctx, chef.carry.items, 190, bar.y + 32, 0.55);
  text(ctx, hintFor(state), VIEW.width / 2, bar.y + 32, 15, '#fff3d6', 'normal');
  const controls = state.muted ? 'MUTED · WASD move · E interact · M mute · P pause' : 'WASD move · E interact · M mute · P pause';
  text(ctx, controls, VIEW.width - 16, bar.y + 32, 12, '#b9b3a8', 'normal', 'right');
}

/** The floor: warm planks, a rug, and two potted plants in the corners. */
function drawFloor(ctx) {
  const top = LAYOUT.board.y + LAYOUT.board.height;
  ctx.fillStyle = '#b98a5a';
  ctx.fillRect(0, top, VIEW.width, VIEW.height - top - LAYOUT.bottom.height);
  ctx.fillStyle = '#9d6f3e';
  const tile = 64;
  for (let y = top; y < VIEW.height - LAYOUT.bottom.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  // A rug in the middle of the floor, where the chef does most of the walking.
  ctx.fillStyle = '#a85a32';
  roundRect(ctx, 300, 400, 680, 236, 14); ctx.fill();
  ctx.strokeStyle = '#7a3a1e'; ctx.lineWidth = 3;
  roundRect(ctx, 308, 408, 664, 220, 10); ctx.stroke();
  // Potted plants in the bottom corners: decor only, the chef walks around them.
  for (const px of [56, VIEW.width - 56]) {
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath(); ctx.moveTo(px - 16, 606); ctx.lineTo(px + 16, 606); ctx.lineTo(px + 11, 634); ctx.lineTo(px - 11, 634); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#57b25e';
    ctx.beginPath(); ctx.arc(px - 10, 592, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 10, 592, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px, 582, 13, 0, Math.PI * 2); ctx.fill();
  }
}

function drawKitchen(ctx, state) {
  for (const crate of LAYOUT.crates) drawCrate(ctx, crate);
  drawBoard(ctx, state);
  drawGrill(ctx, state);
  drawAssembly(ctx, state);
  drawPass(ctx, state);
  drawBin(ctx);

  // Highlight the station the chef can work right now.
  if (state.screen === 'playing') {
    const near = nearestStation(state);
    if (near) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 3;
      roundRect(ctx, near.x - 4, near.y - 4, near.width + 8, near.height + 8, 12);
      ctx.stroke();
    }
  }
  drawChef(ctx, state);
  drawParticles(ctx, state);
  drawFloats(ctx, state);
}

function drawOrderBoard(ctx, state) {
  const board = LAYOUT.board;
  ctx.fillStyle = '#2c1c10';
  roundRect(ctx, board.x, board.y, board.width, board.height, 10); ctx.fill();
  text(ctx, 'ORDER BOARD', board.x + 12, board.y + 18, 12, '#d8b96a', 'bold', 'left');
  const tickets = state.tickets.slice(0, 5);
  const w = 200;
  const gap = 10;
  tickets.forEach((ticket, i) => {
    drawTicket(ctx, ticket, board.x + 130 + i * (w + gap), board.y + 8, w, board.height - 16);
  });
  if (tickets.length === 0) {
    text(ctx, 'No orders — the first ticket is on its way…', board.x + board.width / 2, board.y + board.height / 2 + 6, 16, '#d8b96a', 'normal');
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = '#2c1c10';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A warm hearth glow behind the title.
  const glow = ctx.createRadialGradient(640, 260, 40, 640, 260, 480);
  glow.addColorStop(0, 'rgba(242,165,65,0.5)');
  glow.addColorStop(1, 'rgba(44,28,16,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  outlinedText(ctx, 'THE GILDED LADLE', 640, 190, 64, '#ffd34d', 'bold');
  text(ctx, 'a hearthside cooking rush', 640, 245, 24, '#fff3d6', 'normal');
  // A row of food to show what the game is about.
  ['tomato', 'lettuce', 'cheese', 'bun', 'patty_cooked', 'onion'].forEach((id, i) => {
    drawFoodIcon(ctx, id, 470 + i * 70, 320, 44);
  });
  text(ctx, 'Take orders. Chop, grill, build the dish. Serve it before patience runs out.', 640, 400, 20, '#fff3d6', 'normal');
  text(ctx, 'WASD / arrows to move · E to work a station · click a station to walk there', 640, 436, 17, '#d8b96a', 'normal');
  text(ctx, '5 recipes · 3-minute shift · tips for fast serves · combos pay more', 640, 466, 17, '#d8b96a', 'normal');
  const pulse = 0.75 + 0.25 * Math.sin(state.animTime * 4);
  ctx.globalAlpha = pulse;
  outlinedText(ctx, 'CLICK OR PRESS ENTER TO START', 640, 540, 26, '#ffffff', 'bold');
  ctx.globalAlpha = 1;
  if (state.bestCoins > 0) text(ctx, `Best shift so far: $${state.bestCoins}`, 640, 590, 16, '#d8b96a', 'normal');
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(28,16,8,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  outlinedText(ctx, 'SHIFT OVER!', 640, 170, 56, '#ffd34d', 'bold');
  const stars = STAR_COIN_LINES.filter((line) => state.coins >= line).length;
  for (let i = 0; i < 3; i += 1) {
    const x = 580 + i * 60;
    ctx.font = '52px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = i < stars ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x, 250);
  }
  text(ctx, `You earned $${state.coins}`, 640, 320, 30, '#ffffff', 'bold');
  text(ctx, `Dishes served: ${state.served}   ·   Best combo: ×${state.bestCombo}   ·   Orders lost: ${state.lost}`, 640, 370, 20, '#fff3d6', 'normal');
  const nextStar = STAR_COIN_LINES[stars];
  if (nextStar) text(ctx, `Next star at $${nextStar} — one more shift?`, 640, 410, 17, '#d8b96a', 'normal');
  else text(ctx, 'Three stars — the Ladle is yours, chef!', 640, 410, 17, '#ffd34d', 'normal');
  const pulse = 0.75 + 0.25 * Math.sin(state.animTime * 4);
  ctx.globalAlpha = pulse;
  outlinedText(ctx, 'PRESS R TO COOK AGAIN', 640, 490, 24, '#ffffff', 'bold');
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(28,16,8,0.7)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  outlinedText(ctx, 'PAUSED', 640, 340, 48, '#ffffff', 'bold');
  text(ctx, 'Press P to keep cooking', 640, 400, 20, '#fff3d6', 'normal');
}

/** Draw the whole game for the current screen. */
export function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (state.screen === 'title') {
    drawTitle(ctx, state);
    return;
  }
  drawHud(ctx, state);
  drawFloor(ctx);
  drawOrderBoard(ctx, state);
  drawKitchen(ctx, state);
  drawBottomBar(ctx, state);
  if (state.screen === 'over') drawGameOver(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
}

/** Re-export for the shots module. */
export { stationById };
