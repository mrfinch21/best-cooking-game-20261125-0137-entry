// random.js: a small seeded generator, so one seed always plays the same shift.
// One job: deterministic randomness for orders, spawns and screenshots.

/** mulberry32: a tiny, well-behaved seeded PRNG. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` with the generator. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** An integer in [min, max]. */
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
