// Every tuning number and colour for The Midnight Vault, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The thief: a circle that slips between the display cases. */
export const THIEF = { radius: 14, speed: 255 };

/** A guard patrols between waypoints, watches a cone ahead of it, and gives
 *  chase when it spots the thief. `memory` is how long it keeps hunting
 *  after losing sight. */
export const GUARD = {
  radius: 15,
  patrolSpeed: 82,
  chaseSpeed: 148,
  viewRange: 275,
  viewHalfAngle: 0.6,
  memory: 1.4,
  pauseAtWaypoint: 0.9,
};

/** A wall-mounted camera sweeps its cone back and forth around its base angle. */
export const CAMERA = {
  range: 305,
  halfAngle: 0.48,
  sweepSpeed: 0.6,
  sweepArc: 1.05,
};

/** The alarm fills while any watcher sees the thief and drains while hidden. */
export const ALARM = { rise: 44, decay: 26, max: 100 };

/** What each piece of the haul is worth. */
export const SCORE = { sapphire: 500, gem: 100, escape: 250, decoyCost: 50 };

/** Noisy coins the thief can toss to pull a guard away; two per run. */
export const DECOYS = 2;

/** How close the thief must get to pick something up, and to slip out the door. */
export const PICKUP_RADIUS = 30;
export const EXIT = { x: 0, y: 548, width: 56, height: 108 };

export const PALETTE = {
  backdrop: '#0b0d12',
  floor: '#1a1d27',
  floorTile: '#20242f',
  wall: '#3a4152',
  wallTop: '#4b5468',
  carpet: '#232838',
  player: '#e8b64c',
  playerDark: '#8a6a1f',
  guard: '#7fa8c9',
  guardAlert: '#e5534b',
  camera: '#e5534b',
  coneGuard: 'rgba(255, 214, 90, 0.20)',
  coneGuardSeen: 'rgba(255, 90, 70, 0.30)',
  coneCamera: 'rgba(255, 90, 70, 0.16)',
  coneCameraSeen: 'rgba(255, 90, 70, 0.32)',
  sapphire: '#7fe3ff',
  gem: '#c98bf2',
  exit: '#58c98a',
  exitGlow: 'rgba(88, 201, 138, 0.25)',
  alarmLow: '#58c98a',
  alarmMid: '#e8b64c',
  alarmHigh: '#e5534b',
  panel: '#171a23',
  panelEdge: '#3a4152',
  text: '#eef1f5',
  muted: '#9aa3b5',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
