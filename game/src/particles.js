// particles.js: the juice — chop bits, grill smoke, coin sparkles, floating text.
// One job: short-lived visual feedback. No gameplay state lives here.

/** Add a burst of particles at (x, y). `kind` picks the look. */
export function burst(state, x, y, kind) {
  const specs = {
    chop: { count: 10, colors: ['#e5484d', '#57b25e', '#f2c14e'], speed: 130, life: 0.5, size: 4, gravity: 320 },
    smoke: { count: 6, colors: ['#c9c2b8', '#a89f92', '#d8d2c6'], speed: 24, life: 1.1, size: 7, gravity: -46 },
    sparkle: { count: 12, colors: ['#ffd34d', '#fff3b0', '#f2a541'], speed: 150, life: 0.7, size: 4, gravity: 200 },
    steam: { count: 4, colors: ['#ffffff', '#e8e4da'], speed: 18, life: 0.9, size: 6, gravity: -60 },
  };
  const spec = specs[kind] ?? specs.sparkle;
  for (let i = 0; i < spec.count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = spec.speed * (0.4 + Math.random() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: spec.life * (0.7 + Math.random() * 0.6),
      age: 0,
      size: spec.size * (0.7 + Math.random() * 0.6),
      color: spec.colors[i % spec.colors.length],
      gravity: spec.gravity,
    });
  }
}

/** A short text that floats up and fades (e.g. "+$14"). */
export function floatText(state, x, y, text, color) {
  state.floats.push({ x, y, text, color: color ?? '#ffffff', age: 0, life: 1.2 });
  if (state.floats.length > 24) state.floats.splice(0, state.floats.length - 24);
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.age += dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  state.particles = state.particles.filter((p) => p.age < p.life);
  for (const f of state.floats) f.age += dt;
  state.floats = state.floats.filter((f) => f.age < f.life);
}

export function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const alpha = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - p.age / p.life * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloats(ctx, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floats) {
    const rise = f.age * 46;
    const alpha = 1 - f.age / f.life;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(40,24,12,0.85)';
    ctx.strokeText(f.text, f.x, f.y - rise);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - rise);
  }
  ctx.globalAlpha = 1;
}
