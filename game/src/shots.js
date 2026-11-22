// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame. The start scene lets the patrols drift behind the title
// panel; the play scene creeps toward the loot and flees any cone that
// catches it; the end scene charges straight at the sapphire, as a hurried
// player would, and is caught out for it.
import { EXIT, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 4;
const END_LIMIT_SECONDS = 180;

/** Where the autopilot is heading: the sapphire until it is held, then the door. */
function targetOf(state) {
  if (!state.hasLoot) return { x: state.sapphire.x, y: state.sapphire.y };
  return { x: EXIT.x + EXIT.width / 2, y: EXIT.y + EXIT.height / 2 };
}

/** The watcher currently spotting the thief, if any: a guard or a camera. */
function spotterOf(state) {
  for (const guard of state.guards) if (guard.seen) return guard;
  for (const camera of state.cameras) if (camera.seen) return camera;
  return null;
}

/** A cautious step: toward the target, but sideways out of any cone that
 *  catches the thief — a cone is narrow, so stepping across it breaks the
 *  line of sight far faster than running away from its watcher. */
function cautiousStep(state) {
  const thief = state.thief;
  const target = targetOf(state);
  let dx = target.x - thief.x;
  let dy = target.y - thief.y;
  const spotter = spotterOf(state);
  if (spotter !== null) {
    // Step across the cone: perpendicular to the line from the watcher,
    // on the side that still drifts toward the target.
    const awayX = thief.x - spotter.x;
    const awayY = thief.y - spotter.y;
    const length = Math.hypot(awayX, awayY) || 1;
    let px = -awayY / length;
    let py = awayX / length;
    if (px * dx + py * dy < 0) {
      px = -px;
      py = -py;
    }
    dx = px * 1.2 + dx * 0.25;
    dy = py * 1.2 + dy * 0.25;
  }
  const length = Math.hypot(dx, dy);
  if (length < 8) return { x: 0, y: 0 };
  return { x: dx / length, y: dy / length };
}

/** A reckless step: straight at the target, cones ignored. */
function recklessStep(state) {
  const thief = state.thief;
  const target = targetOf(state);
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const length = Math.hypot(dx, dy);
  if (length < 8) return { x: 0, y: 0 };
  return { x: dx / length, y: dy / length };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? recklessStep : cautiousStep;
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    events = world.step(STEP, pilot(world.state).x, pilot(world.state).y, false);
    if (events & EVENT_CAUGHT) break;
    if (events & EVENT_WIN) break;
  }
  if (world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
  if (world.state.caught) return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
