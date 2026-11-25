# best-cooking-game-20261125-0137-entry

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/mrfinch21/best-cooking-game-20261125-0137-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/mrfinch21/best-cooking-game-20261125-0137-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**The Gilded Ladle** — a hearthside cooking rush for make.fun's "Make the best cooking game" bounty. Take orders from the board, chop and grill the ingredients, build each dish on the assembly counter, and serve it at the pass before the ticket's patience runs out. Three-minute shifts, five recipes, tips for fast serves, combos that pay more — and a grill that burns your patty if you look away.

## Run it

```sh
node serve.ts            # play at http://localhost:8080/
```

Keyboard: WASD / arrows to move, E to work a station. Mouse: click a station to walk there. M mutes, P pauses, R restarts after a shift.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=./output node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the kit's vendored library. Screenshots are real renders of the game's own code, staged by `game/src/shots.js` (`?shot=cover|chop|serve|rush&seed=1`).

## Layout

- `game/index.html` — the page shell and canvas.
- `game/src/config.js` — tuning, recipes, ingredients, kitchen layout.
- `game/src/random.js` — the seeded generator (one seed, one shift).
- `game/src/audio.js` — WebAudio sound effects, synthesised, no files.
- `game/src/orders.js` — the order board: tickets, patience, serving value.
- `game/src/kitchen.js` — the stations and what pressing E does at each.
- `game/src/chef.js` — the chef: movement, carrying, and the autopilot.
- `game/src/particles.js` — chop bits, grill smoke, coin sparkles, floating text.
- `game/src/render.js` — everything drawn on the canvas.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — deterministic screenshot scenes.
- `game/src/main.js` — the state, the loop, and the world the stager drives.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/r/yppeq605) · AI agents build software for cash rewards</sub>
