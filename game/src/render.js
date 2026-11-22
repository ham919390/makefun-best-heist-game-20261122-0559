// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Canvas shapes and text only — every sprite
// is drawn, nothing is loaded. Text that holds a number is rebuilt only when
// the number changes, so a frame allocates nothing.
import { CAMERA, EXIT, FIELD, FONT, GUARD, PALETTE, THIEF } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 130, line: 32, bottom: 72 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const timeLabel = cachedLabel('Time ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawCone(x, y, angle, range, halfAngle, fill) {
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fill();
  }

  function drawDiamond(x, y, size, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.7, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.7, y);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.7)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x - size * 0.7, y);
    context.lineTo(x + size * 0.7, y);
    context.moveTo(x, y - size);
    context.lineTo(x, y + size);
    context.stroke();
  }

  function drawField(state) {
    // Floor with a checker of large tiles and a carpet runner down the middle.
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floorTile;
    for (let ty = 0; ty < 6; ty += 1) {
      for (let tx = 0; tx < 10; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(24 + tx * 128, 24 + ty * 120, 128, 120);
      }
    }
    context.fillStyle = PALETTE.carpet;
    context.fillRect(560, 24, 160, FIELD.height - 48);

    // The exit door: a green doorway in the left wall, glowing when the loot is held.
    context.fillStyle = state.hasLoot ? PALETTE.exitGlow : 'rgba(88, 201, 138, 0.10)';
    context.fillRect(0, EXIT.y - 6, 70, EXIT.height + 12);
    context.fillStyle = PALETTE.exit;
    context.fillRect(0, EXIT.y, 10, EXIT.height);
    context.save();
    context.translate(32, EXIT.y + EXIT.height / 2 + 22);
    context.rotate(-Math.PI / 2);
    text('EXIT', 0, 0, 18, PALETTE.exit, 'center');
    context.restore();

    // The Star Sapphire's display case, top right.
    if (!state.sapphire.taken) {
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 3);
      context.fillStyle = `rgba(127, 227, 255, ${0.12 * pulse})`;
      context.beginPath();
      context.arc(state.sapphire.x, state.sapphire.y, 46, 0, Math.PI * 2);
      context.fill();
      drawDiamond(state.sapphire.x, state.sapphire.y, 20, PALETTE.sapphire);
    }
    for (const gem of state.gems) {
      if (!gem.taken) drawDiamond(gem.x, gem.y, 11, PALETTE.gem);
    }

    // The vision cones, under the walls so the cases read as cover.
    for (const guard of state.guards) {
      drawCone(guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle, guard.seen ? PALETTE.coneGuardSeen : PALETTE.coneGuard);
    }
    for (const camera of state.cameras) {
      drawCone(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle, camera.seen ? PALETTE.coneCameraSeen : PALETTE.coneCamera);
    }

    // Walls and cases, drawn over the cones.
    for (const wall of state.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 4);
    }

    // Cameras: a mount on the wall and a lens that follows the sweep.
    for (const camera of state.cameras) {
      context.fillStyle = PALETTE.camera;
      context.beginPath();
      context.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3, 0, Math.PI * 2);
      context.fill();
    }

    // Guards: a uniformed body, a cap, and a nose that shows which way they face.
    for (const guard of state.guards) {
      const body = guard.seen || guard.chase > 0 ? PALETTE.guardAlert : PALETTE.guard;
      context.fillStyle = body;
      context.beginPath();
      context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1c2733';
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = body;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.angle) * (guard.radius + 7), guard.y + Math.sin(guard.angle) * (guard.radius + 7));
      context.stroke();
    }

    // The thief: a gold-hooded figure with a dark mask, facing where it moves.
    const thief = state.thief;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(thief.x, thief.y, thief.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerDark;
    context.beginPath();
    context.arc(thief.x + Math.cos(thief.angle) * 5, thief.y + Math.sin(thief.angle) * 5, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#11141b';
    context.fillRect(
      thief.x + Math.cos(thief.angle) * 9 - 3,
      thief.y + Math.sin(thief.angle) * 9 - 2,
      7,
      4,
    );

    // A tossed decoy coin, still ringing.
    if (state.decoy !== null) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.decoy.x, state.decoy.y, 10 + (3.5 - state.decoy.timer) * 6, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(state.decoy.x, state.decoy.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 26, PALETTE.text, 'left');
    text(timeLabel(Math.floor(state.time)), 24, 50, 20, PALETTE.muted, 'left');

    // The alarm meter, top centre: it fills gold, then red, as the vault notices you.
    const meter = { x: FIELD.width / 2 - 180, y: 18, w: 360, h: 22 };
    const fraction = state.alarm / 100;
    const alarmColor = fraction < 0.5 ? PALETTE.alarmLow : fraction < 0.8 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    text('ALARM', meter.x - 12, meter.y + 2, 20, state.seen ? PALETTE.alarmHigh : PALETTE.muted, 'right');
    context.fillStyle = '#0d0f14';
    context.fillRect(meter.x, meter.y, meter.w, meter.h);
    context.fillStyle = alarmColor;
    context.fillRect(meter.x, meter.y, meter.w * fraction, meter.h);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(meter.x, meter.y, meter.w, meter.h);
    if (state.seen) text('SPOTTED!', meter.x + meter.w / 2, meter.y + 34, 18, PALETTE.alarmHigh, 'center');

    // Loot status and decoys, top right.
    const lootText = state.hasLoot ? '◆ SAPPHIRE' : '○ SAPPHIRE';
    text(lootText, FIELD.width - 24, 18, 24, state.hasLoot ? PALETTE.sapphire : PALETTE.muted, 'right');
    const takenGems = state.gems.filter((gem) => gem.taken).length;
    text(`Gems ${takenGems}/3   Coins ${state.decoys}`, FIELD.width - 24, 50, 20, PALETTE.muted, 'right');

    // A hint line at the bottom while playing.
    text('WASD / arrows to move · Q tosses a noisy coin · P pauses', FIELD.width / 2, FIELD.height - 28, 16, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(8, 10, 14, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'One thief. One vault. Three guards, two cameras, one Star Sapphire.',
    'Slip past the vision cones, grab the sapphire, reach the green EXIT.',
    'Being seen fills the alarm — full alarm, or a guard\'s hands, ends the run.',
    'Purple gems are worth 100 each. Q tosses a coin to lure a guard away.',
    'Move with WASD or arrows.  Pause with P.  Restart with R.',
    '',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('The Midnight Vault', TITLE_LINES, 'Press Space or click to start');
      // The alarm meter and loot status stay visible over the title, so the
      // cover shot shows the whole game in one frame.
      drawHud(state);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = state.cause;
      OVER_LINES[1] = `${finalLabel(state.score)}   ${bestLabel(best)}`;
      drawPanel('Caught!', OVER_LINES, 'Press Space or click to try again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = `Clean getaway in ${Math.floor(state.time)} seconds.`;
      WIN_LINES[1] = `${finalLabel(state.score)}   ${bestLabel(best)}`;
      drawPanel('Clean Getaway!', WIN_LINES, 'Press Space or click to steal again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
