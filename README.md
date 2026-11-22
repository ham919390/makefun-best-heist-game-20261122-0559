# The Midnight Vault

[![best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/ham919390/makefun-best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/ham919390/makefun-best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An original browser heist game built for the
[best-heist-game-20261122-0559](https://make.fun/bounty/best-heist-game-20261122-0559)
bounty on make.fun. One thief slips into a museum vault at night: three guards
patrol with vision cones, two security cameras sweep theirs across the room,
and the Star Sapphire glows in its case at the far end. Being seen fills the
alarm meter — a full alarm, or a guard's hands, ends the run. Grab the
sapphire, pocket the purple bonus gems if you dare, and reach the green EXIT
door for a clean getaway. A noisy coin (Q) can pull a guard away from your
route, at a price. Everything is drawn in code and runs from plain static
files, with no network requests and no libraries.

## How to play

- **Move:** WASD or the arrow keys
- **Start / restart:** Space, Enter, or click — R restarts mid-run
- **Pause:** P or Esc
- **Toss a noisy coin:** Q (two per run, costs 50 score; the nearest guard walks over to look)

Grab the Star Sapphire (500 points), then escape through the green EXIT door
for a getaway bonus. Each purple gem is worth 100. Hide behind the display
cases and pillars — walls block vision as well as movement, and the alarm
drains while you stay out of sight.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Screenshots

The three screenshots in `screenshots/` are real renders of this game, staged
with `?shot=start|play|end&seed=1`.

Referral code: ej1tk366
