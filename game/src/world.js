// The game's rules and state, with no drawing and no browser in it: the thief,
// the patrolling guards and their vision cones, the sweeping cameras, the
// walls that block both movement and sight, the loot, the alarm meter and the
// exit. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.
import { ALARM, CAMERA, DECOYS, EXIT, FIELD, GUARD, PICKUP_RADIUS, SCORE, THIEF } from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_GEM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_DECOY = 16;

/** The room's walls: the border (with a gap on the left where the exit door
 *  stands) plus the display cases and pillars the thief hides behind. */
const BORDER = [
  { x: 0, y: 0, w: FIELD.width, h: 24 },
  { x: 0, y: FIELD.height - 24, w: FIELD.width, h: 24 },
  { x: FIELD.width - 24, y: 0, w: 24, h: FIELD.height },
  { x: 0, y: 0, w: 24, h: EXIT.y },
  { x: 0, y: EXIT.y + EXIT.height, w: 24, h: FIELD.height - (EXIT.y + EXIT.height) },
];
const CASES = [
  { x: 420, y: 120, w: 32, h: 180 },
  { x: 700, y: 180, w: 280, h: 32 },
  { x: 880, y: 380, w: 32, h: 180 },
  { x: 180, y: 430, w: 240, h: 32 },
  { x: 600, y: 420, w: 40, h: 100 },
];

const SAPPHIRE_SPOT = { x: 1150, y: 92 };
const GEM_SPOTS = [
  { x: 300, y: 150 },
  { x: 1000, y: 520 },
  { x: 560, y: 640 },
];
const THIEF_START = { x: 96, y: 600 };

/** Does the segment from (ax, ay) to (bx, by) cross the rectangle? Slab test. */
function segmentHitsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < rect.x || ax > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - ax) / dx;
    let t2 = (rect.x + rect.w - ax) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (ay < rect.y || ay > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - ay) / dy;
    let t2 = (rect.y + rect.h - ay) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function hitsAnyWall(x, y, radius, walls) {
  for (let index = 0; index < walls.length; index += 1) {
    if (circleHitsRect(x, y, radius, walls[index])) return true;
  }
  return false;
}

/** Move a circle by (dx, dy), sliding along walls: each axis is tried on its own. */
function moveCircle(entity, dx, dy, walls) {
  const nextX = entity.x + dx;
  if (
    nextX - entity.radius >= 24 &&
    nextX + entity.radius <= FIELD.width - 24 &&
    !hitsAnyWall(nextX, entity.y, entity.radius, walls)
  ) {
    entity.x = nextX;
  }
  const nextY = entity.y + dy;
  if (
    nextY - entity.radius >= 24 &&
    nextY + entity.radius <= FIELD.height - 24 &&
    !hitsAnyWall(entity.x, nextY, entity.radius, walls)
  ) {
    entity.y = nextY;
  }
}

/** Walk toward (tx, ty) at `speed`; returns true when the target is reached. */
function moveToward(entity, tx, ty, speed, dt, walls) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const distance = Math.hypot(dx, dy);
  const step = speed * dt;
  if (distance <= step) {
    moveCircle(entity, dx, dy, walls);
    return true;
  }
  entity.angle = Math.atan2(dy, dx);
  moveCircle(entity, (dx / distance) * step, (dy / distance) * step, walls);
  return false;
}

/** Can the watcher at (eyeX, eyeY) facing `angle` see the point (tx, ty)? */
function canSee(eyeX, eyeY, angle, range, halfAngle, tx, ty, walls) {
  const dx = tx - eyeX;
  const dy = ty - eyeY;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  for (let index = 0; index < walls.length; index += 1) {
    if (segmentHitsRect(eyeX, eyeY, tx, ty, walls[index])) return false;
  }
  return true;
}

export function createWorld(random) {
  const walls = BORDER.concat(CASES);
  const thief = { x: THIEF_START.x, y: THIEF_START.y, radius: THIEF.radius, angle: -Math.PI / 2 };
  const guards = [
    {
      x: 300, y: 340, radius: GUARD.radius, angle: 0,
      waypoints: [{ x: 300, y: 340 }, { x: 1000, y: 340 }],
      wpIndex: 1, pause: 0, chase: 0, investigate: 0, tx: 0, ty: 0, seen: false,
    },
    {
      x: 1050, y: 120, radius: GUARD.radius, angle: Math.PI / 2,
      waypoints: [{ x: 1050, y: 120 }, { x: 1050, y: 560 }],
      wpIndex: 1, pause: 0, chase: 0, investigate: 0, tx: 0, ty: 0, seen: false,
    },
    {
      x: 180, y: 96, radius: GUARD.radius, angle: 0,
      waypoints: [{ x: 180, y: 96 }, { x: 760, y: 96 }],
      wpIndex: 1, pause: 0, chase: 0, investigate: 0, tx: 0, ty: 0, seen: false,
    },
  ];
  const cameras = [
    { x: 640, y: 30, baseAngle: Math.PI / 2, angle: Math.PI / 2, seen: false },
    { x: 1250, y: 400, baseAngle: Math.PI, angle: Math.PI, seen: false },
  ];
  const gems = GEM_SPOTS.map((spot) => ({ x: spot.x, y: spot.y, taken: false }));
  const sapphire = { x: SAPPHIRE_SPOT.x, y: SAPPHIRE_SPOT.y, taken: false };
  const state = {
    thief, guards, cameras, gems, sapphire, walls,
    exit: EXIT,
    alarm: 0, score: 0, time: 0, hasLoot: false,
    decoys: DECOYS, decoy: null,
    won: false, caught: false, seen: false, cause: '',
  };

  function reset() {
    thief.x = THIEF_START.x;
    thief.y = THIEF_START.y;
    thief.angle = -Math.PI / 2;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      guard.x = guard.waypoints[0].x;
      guard.y = guard.waypoints[0].y;
      guard.angle = index === 1 ? Math.PI / 2 : 0;
      guard.wpIndex = 1;
      guard.pause = random() * 0.6;
      guard.chase = 0;
      guard.investigate = 0;
      guard.seen = false;
    }
    for (const camera of cameras) {
      camera.angle = camera.baseAngle;
      camera.seen = false;
    }
    for (const gem of gems) gem.taken = false;
    sapphire.taken = false;
    state.alarm = 0;
    state.score = 0;
    state.time = 0;
    state.hasLoot = false;
    state.decoys = DECOYS;
    state.decoy = null;
    state.won = false;
    state.caught = false;
    state.seen = false;
    state.cause = '';
  }

  function updateGuard(guard, dt) {
    if (guard.investigate > 0) {
      if (moveToward(guard, guard.tx, guard.ty, GUARD.patrolSpeed, dt, walls)) {
        guard.investigate = 0;
        guard.pause = 0.8;
      } else {
        guard.investigate -= dt;
      }
      return;
    }
    if (guard.chase > 0) {
      moveToward(guard, thief.x, thief.y, GUARD.chaseSpeed, dt, walls);
      guard.chase -= dt;
      return;
    }
    if (guard.pause > 0) {
      guard.pause -= dt;
      return;
    }
    const target = guard.waypoints[guard.wpIndex];
    if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, walls)) {
      guard.pause = GUARD.pauseAtWaypoint;
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
    }
  }

  /** Toss a noisy coin where the thief stands: the nearest guard walks over
   *  to look. Returns true when a coin was thrown. */
  function throwDecoy() {
    if (state.decoys <= 0 || state.won || state.caught) return false;
    state.decoys -= 1;
    state.score = Math.max(0, state.score - SCORE.decoyCost);
    state.decoy = { x: thief.x, y: thief.y, timer: 3.5 };
    let nearest = null;
    let nearestDistance = 460;
    for (const guard of guards) {
      const distance = Math.hypot(guard.x - thief.x, guard.y - thief.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = guard;
      }
    }
    if (nearest !== null) {
      nearest.chase = 0;
      nearest.investigate = 3.5;
      nearest.tx = thief.x;
      nearest.ty = thief.y;
    }
    return true;
  }

  /**
   * One fixed step. `dx` and `dy` are the steering vector (-1..1 each).
   * With `harmless` set (the title screen's backdrop) the patrols move but
   * nothing spots the thief and nothing scores.
   */
  function step(dt, dx, dy, harmless) {
    let events = 0;
    if (state.won || state.caught) return events;
    state.time += dt;

    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const nx = dx / length;
      const ny = dy / length;
      thief.angle = Math.atan2(ny, nx);
      moveCircle(thief, nx * THIEF.speed * dt, ny * THIEF.speed * dt, walls);
    }

    for (const camera of cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.time * CAMERA.sweepSpeed) * CAMERA.sweepArc;
    }
    for (const guard of guards) updateGuard(guard, dt);

    if (state.decoy !== null) {
      state.decoy.timer -= dt;
      if (state.decoy.timer <= 0) state.decoy = null;
    }

    // Who can see the thief right now?
    let seen = false;
    for (const guard of guards) {
      guard.seen = !harmless && canSee(guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle, thief.x, thief.y, walls);
      if (guard.seen) {
        seen = true;
        guard.chase = GUARD.memory;
        guard.investigate = 0;
      }
    }
    for (const camera of cameras) {
      camera.seen = !harmless && canSee(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle, thief.x, thief.y, walls);
      if (camera.seen) seen = true;
    }
    state.seen = seen;

    if (!harmless) {
      state.alarm = Math.max(0, Math.min(ALARM.max, state.alarm + (seen ? ALARM.rise : -ALARM.decay) * dt));
      if (state.alarm >= ALARM.max) {
        state.caught = true;
        state.cause = 'The alarm hit full — the vault locked down.';
        return EVENT_CAUGHT;
      }
      for (const guard of guards) {
        if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < guard.radius + thief.radius - 2) {
          state.caught = true;
          state.cause = 'A guard grabbed the thief.';
          return EVENT_CAUGHT;
        }
      }

      if (!sapphire.taken && Math.hypot(thief.x - sapphire.x, thief.y - sapphire.y) < PICKUP_RADIUS) {
        sapphire.taken = true;
        state.hasLoot = true;
        state.score += SCORE.sapphire;
        events |= EVENT_LOOT;
      }
      for (const gem of gems) {
        if (!gem.taken && Math.hypot(thief.x - gem.x, thief.y - gem.y) < PICKUP_RADIUS) {
          gem.taken = true;
          state.score += SCORE.gem;
          events |= EVENT_GEM;
        }
      }
      if (
        state.hasLoot &&
        thief.x > EXIT.x && thief.x < EXIT.x + EXIT.width &&
        thief.y > EXIT.y && thief.y < EXIT.y + EXIT.height
      ) {
        state.won = true;
        state.score += SCORE.escape + Math.max(0, 200 - Math.floor(state.time));
        return events | EVENT_WIN;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, throwDecoy };
}
