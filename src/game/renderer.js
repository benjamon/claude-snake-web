import { COLS, ROWS, C, rgb, rgbA, brighten, darken } from './constants.js';

// Render a snapshot frame (used for replay playback)
// Full-detail rendering matching the live game
function renderSnapshot(ctx, frame, layout, alpha, replayTime) {
  const { gCell, boardX, boardY } = layout;
  const boardW = gCell * COLS, boardH = gCell * ROWS;
  const gt = replayTime || frame.gTime || 0; // animated time

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(boardX, boardY);

  // Board BG
  ctx.fillStyle = rgb('BOARD_BG');
  ctx.fillRect(0, 0, boardW, boardH);

  // Grid
  ctx.strokeStyle = rgb('GRID'); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * gCell, 0); ctx.lineTo(x * gCell, boardH); }
  for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * gCell); ctx.lineTo(boardW, y * gCell); }
  ctx.stroke();

  // Wall events (drawn as death blocks)
  for (const w of frame.wallEvents) {
    if (w.warningSteps > 0) {
      const fl = (Math.sin(gt * 14) + 1) * 0.5;
      const a = fl * 0.35;
      for (const c of w.cells) {
        ctx.fillStyle = rgbA(C.BLOCK, a);
        ctx.fillRect(c.x * gCell + 1, c.y * gCell + 1, gCell - 2, gCell - 2);
        ctx.strokeStyle = rgbA(C.BLOCK_MARK, a * 0.8);
        ctx.lineWidth = Math.max(1, gCell / 8);
        const m = gCell * 0.25;
        ctx.beginPath();
        ctx.moveTo(c.x * gCell + m, c.y * gCell + m); ctx.lineTo(c.x * gCell + gCell - m, c.y * gCell + gCell - m);
        ctx.moveTo(c.x * gCell + gCell - m, c.y * gCell + m); ctx.lineTo(c.x * gCell + m, c.y * gCell + gCell - m);
        ctx.stroke();
      }
    } else if (w.stepsRemaining > 0) {
      const a = Math.min(1, w.stepsRemaining / 10) * 0.85;
      for (const c of w.cells) {
        ctx.fillStyle = rgbA(C.BLOCK, a);
        ctx.fillRect(c.x * gCell + 1, c.y * gCell + 1, gCell - 2, gCell - 2);
        ctx.strokeStyle = rgbA(C.BLOCK_MARK, a * 0.8);
        ctx.lineWidth = Math.max(1, gCell / 8);
        const m = gCell * 0.25;
        ctx.beginPath();
        ctx.moveTo(c.x * gCell + m, c.y * gCell + m); ctx.lineTo(c.x * gCell + gCell - m, c.y * gCell + gCell - m);
        ctx.moveTo(c.x * gCell + gCell - m, c.y * gCell + m); ctx.lineTo(c.x * gCell + m, c.y * gCell + gCell - m);
        ctx.stroke();
      }
    }
  }

  // Death blocks
  for (let i = 0; i < frame.deathBlocks.length; i++) {
    const b = frame.deathBlocks[i], fl = (frame.deathBlockFlash && frame.deathBlockFlash[i]) || 0;
    const bx = b.x * gCell + 1, by = b.y * gCell + 1, bw = gCell - 2, bh = gCell - 2;
    ctx.fillStyle = rgb('BLOCK');
    ctx.fillRect(bx, by, bw, bh);
    if (fl > 0) { ctx.fillStyle = rgbA(C.BLOCK_MARK, fl); ctx.fillRect(bx, by, bw, bh); }
    ctx.strokeStyle = rgbA(brighten(C.BLOCK_MARK, 0.3), 0.9);
    ctx.lineWidth = Math.max(1, gCell / 10);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = rgbA(brighten(C.BLOCK_MARK, 0.5), 1.0);
    ctx.lineWidth = Math.max(2, gCell / 6);
    const m = gCell * 0.25;
    ctx.beginPath();
    ctx.moveTo(b.x * gCell + m, b.y * gCell + m); ctx.lineTo(b.x * gCell + gCell - m, b.y * gCell + gCell - m);
    ctx.moveTo(b.x * gCell + gCell - m, b.y * gCell + m); ctx.lineTo(b.x * gCell + m, b.y * gCell + gCell - m);
    ctx.stroke();
  }

  // Portal connecting lines
  const gScale = gCell / 20;
  const linePx = Math.max(2, Math.round(5 * gScale));
  for (const pp of frame.portalPairs) {
    const t = Math.min(1, (gt - (pp.spawnTime || 0)) / 0.8);
    const ax = pp.a.x * gCell + gCell / 2, ay = pp.a.y * gCell + gCell / 2;
    const bx = pp.b.x * gCell + gCell / 2, by = pp.b.y * gCell + gCell / 2;
    const eax = ax + (bx - ax) * t * 0.5, eay = ay + (by - ay) * t * 0.5;
    const ebx = bx + (ax - bx) * t * 0.5, eby = by + (ay - by) * t * 0.5;
    ctx.strokeStyle = rgbA(pp.color, 0.62);
    ctx.lineWidth = linePx;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(eax, eay);
    ctx.moveTo(bx, by); ctx.lineTo(ebx, eby);
    ctx.stroke();
  }

  // Portal rings
  for (const pp of frame.portalPairs) {
    const drawPortal = (cell) => {
      const cx = cell.x * gCell + gCell / 2, cy = cell.y * gCell + gCell / 2;
      const maxR = gCell * 0.47;
      const pulse = (Math.sin(gt * 3.5) + 1) * 0.5;
      const lw = Math.max(2, gCell / 7);
      const [pr, pg, pb] = pp.color;
      for (let ring = 0; ring < 4; ring++) {
        const r = maxR * (1 - ring / 4);
        const bright = ring % 2 === 0;
        const a = bright ? 0.95 - ring * 0.10 : 0.55 - ring * 0.05;
        const fac = bright ? 1 : 0.6;
        const rc = Math.min(255, pr * fac + pulse * 40) | 0;
        const gc = Math.min(255, pg * fac + pulse * 20) | 0;
        const bc = Math.min(255, pb * fac + pulse * 40) | 0;
        ctx.strokeStyle = `rgba(${rc},${gc},${bc},${a})`;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${Math.min(255, pr + 100)},${Math.min(255, pg + 100)},${Math.min(255, pb + 100)},${0.5 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(cx, cy, lw, 0, Math.PI * 2); ctx.fill();
    };
    drawPortal(pp.a); drawPortal(pp.b);
  }

  // Tunnel powerups
  if (frame.tunnelPowerups) for (const tp of frame.tunnelPowerups) {
    const tBob = Math.sin(gt * 2.8 + tp.x * 1.1 + tp.y * 0.7) * (gCell * 0.105);
    const cx = tp.x * gCell + gCell / 2, cy = tp.y * gCell + gCell / 2 + tBob;
    const age = gt - (tp.spawnTime || 0);
    const spawnT = Math.min(age / 0.6, 1);
    const spawnSc = 3 - 2 * spawnT;
    const pulse = (Math.sin(gt * 3.5 + tp.x * 0.7 + tp.y * 1.3) + 1) * 0.5;
    const baseR = (gCell / 2 - 2) * spawnSc;
    const ringR = baseR * (0.9 + pulse * 0.1);
    const lw = Math.max(2, gCell / 7);
    ctx.fillStyle = rgbA(darken(C.PHASE_HEAD, 0.8), 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgbA(C.PHASE_HEAD, 0.8 + pulse * 0.2);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
  }

  // Halo powerups
  if (frame.haloPowerups) for (const hp of frame.haloPowerups) {
    const hBob = Math.sin(gt * 2.8 + hp.x * 0.9 + hp.y * 1.3) * (gCell * 0.105);
    const cx = hp.x * gCell + gCell / 2, cy = hp.y * gCell + gCell / 2 + hBob;
    const pulse = (Math.sin(gt * 3.5 + hp.x * 1.1 + hp.y * 0.9) + 1) * 0.5;
    const spin = gt * 1.2;
    ctx.fillStyle = 'rgba(40,32,0,0.85)';
    ctx.fillRect(hp.x * gCell + 2, hp.y * gCell + 2 + hBob, gCell - 4, gCell - 4);
    const r1 = (gCell / 2 - 2) * (0.95 + 0.05 * pulse);
    const lw = Math.max(1, gCell / 12);
    ctx.lineWidth = lw;
    ctx.strokeStyle = `rgba(255,210,40,${0.6 + pulse * 0.35})`;
    ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,230,120,${0.3 + pulse * 0.15})`;
    ctx.lineWidth = Math.max(1, gCell / 16);
    ctx.beginPath(); ctx.arc(cx, cy, r1 - Math.max(1, gCell / 14), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,220,80,${0.45 + pulse * 0.25})`;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, r1 * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,240,160,${0.28 + pulse * 0.22})`;
    ctx.beginPath(); ctx.arc(cx, cy, r1 * 0.36, 0, Math.PI * 2); ctx.fill();
    for (let g = 0; g < 4; g++) {
      const ang = spin + g * Math.PI / 2;
      ctx.fillStyle = 'rgba(255,255,200,0.8)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, Math.max(1, gCell / 10), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crown pickups
  if (frame.crownPickups) for (const cp of frame.crownPickups) {
    const cBob = Math.sin(gt * 2.8 + cp.x * 0.8 + cp.y * 1.1) * (gCell * 0.105);
    const age = gt - (cp.spawnTime || 0);
    const spawnT = Math.min(age / 0.6, 1);
    const spawnSc = 3 - 2 * spawnT;
    const pulse = (Math.sin(gt * 3.5 + cp.x + cp.y) + 1) * 0.5;
    const cx = cp.x * gCell + gCell / 2, cy = cp.y * gCell + gCell / 2 + cBob;
    const sz = (gCell * 0.36) * spawnSc;
    ctx.fillStyle = `rgba(255,215,0,${0.85 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy + sz * 0.5); ctx.lineTo(cx - sz, cy - sz * 0.2);
    ctx.lineTo(cx - sz * 0.5, cy + sz * 0.15); ctx.lineTo(cx, cy - sz * 0.7);
    ctx.lineTo(cx + sz * 0.5, cy + sz * 0.15); ctx.lineTo(cx + sz, cy - sz * 0.2);
    ctx.lineTo(cx + sz, cy + sz * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,50,50,${0.8 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(cx, cy + sz * 0.1, sz * 0.15, 0, Math.PI * 2); ctx.fill();
  }

  // Food
  if (frame.food) {
    const age = gt - (frame.foodSpawnTime || 0);
    const t = Math.min(age / 0.6, 1);
    const sc = 3 - 2 * t;
    const bob = Math.sin(gt * 2.8) * (gCell * 0.105) * t;
    const pulse = Math.sin(gt * 4.2) * 0.10 * t;
    const r = Math.max(1, (gCell * sc * 0.5 - gCell * 0.04) * (1 + pulse * 0.3));
    const cx = frame.food.x * gCell + gCell / 2;
    const cy = frame.food.y * gCell + gCell / 2 + bob;
    ctx.fillStyle = rgb('FOOD');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    const shineR = Math.max(1, r * 0.3);
    ctx.fillStyle = 'rgba(255,200,200,0.6)';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, shineR, 0, Math.PI * 2); ctx.fill();
  }

  // Ghost trail
  for (let i = frame.snake.length - 1; i >= 1; i--) {
    if (frame.snakeGhost[i]) {
      ctx.fillStyle = rgbA(C.GHOST, 0.22);
      ctx.fillRect(frame.snake[i].x * gCell + 3, frame.snake[i].y * gCell + 3, gCell - 6, gCell - 6);
    }
  }

  // Snake body
  const bCol = frame.phaseTicks > 0 ? C.PHASE_BODY : C.BODY;
  const edgeW = Math.max(1, Math.round(gCell * 0.12));
  const fadeStart = frame.snake.length - Math.max(1, (frame.snake.length * 0.3) | 0);
  for (let i = frame.snake.length - 1; i >= 1; i--) {
    if (!frame.snakeGhost[i]) {
      let a = i >= fadeStart ? 0.55 + (1 - 0.55) * (1 - (i - fadeStart) / (frame.snake.length - fadeStart)) : 1.0;
      if (frame.phaseTicks > 0) a = Math.min(a, 0.78);
      const sx = frame.snake[i].x * gCell + 2, sy = frame.snake[i].y * gCell + 2;
      const sw = gCell - 4, sh = gCell - 4;
      ctx.fillStyle = rgbA(bCol, a);
      ctx.fillRect(sx, sy, sw, sh);
      if (frame.snakeDir && frame.snakeDir[i]) {
        const d = frame.snakeDir[i];
        const da = frame.snakeDir[i - 1] || d;
        const isTail = (i === frame.snake.length - 1);
        const isCorner = (d.x !== da.x || d.y !== da.y);
        let top = false, bot = false, lft = false, rgt = false;
        if (!isCorner) {
          if (d.x !== 0) { top = true; bot = true; }
          else            { lft = true; rgt = true; }
          if (isTail) {
            if (d.x === 1)  lft = true;
            if (d.x === -1) rgt = true;
            if (d.y === 1)  top = true;
            if (d.y === -1) bot = true;
          }
        } else {
          const eX = -d.x, eY = -d.y;
          top = (eY !== -1 && da.y !== -1);
          bot = (eY !== 1  && da.y !== 1);
          lft = (eX !== -1 && da.x !== -1);
          rgt = (eX !== 1  && da.x !== 1);
        }
        ctx.fillStyle = `rgba(0,0,0,${0.25 * a})`;
        if (top) ctx.fillRect(sx, sy, sw, edgeW);
        if (bot) ctx.fillRect(sx, sy + sh - edgeW, sw, edgeW);
        if (lft) ctx.fillRect(sx, sy, edgeW, sh);
        if (rgt) ctx.fillRect(sx + sw - edgeW, sy, edgeW, sh);
      }
    }
  }

  // Head
  const hCol = frame.phaseTicks > 0 ? C.PHASE_HEAD : C.HEAD;
  ctx.fillStyle = rgbA(hCol);
  ctx.fillRect(frame.snake[0].x * gCell + 1, frame.snake[0].y * gCell + 1, gCell - 2, gCell - 2);

  // Eyes
  if (frame.dir) {
    const eOff = Math.round(gCell * 0.22), eSz = Math.max(2, Math.round(gCell * 0.18));
    const px = -frame.dir.y, py = frame.dir.x;
    const ecx = frame.snake[0].x * gCell + gCell / 2, ecy = frame.snake[0].y * gCell + gCell / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(ecx + frame.dir.x * eOff + px * eOff - eSz / 2, ecy + frame.dir.y * eOff + py * eOff - eSz / 2, eSz, eSz);
    ctx.fillRect(ecx + frame.dir.x * eOff - px * eOff - eSz / 2, ecy + frame.dir.y * eOff - py * eOff - eSz / 2, eSz, eSz);
  }

  // Worn crown
  if (frame.crown && frame.dir) {
    const crX = frame.snake[0].x + frame.dir.y;
    const crY = frame.snake[0].y - frame.dir.x;
    if (crX >= 0 && crX < COLS && crY >= 0 && crY < ROWS) {
      const ccx = crX * gCell + gCell / 2, ccy = crY * gCell + gCell / 2;
      const csz = gCell * 0.36;
      const cpulse = (Math.sin(gt * 4) + 1) * 0.5;
      const angle = Math.atan2(frame.dir.x, frame.dir.y);
      ctx.save();
      ctx.translate(ccx, ccy);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(255,215,0,${0.9 + cpulse * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(-csz, csz * 0.5); ctx.lineTo(-csz, -csz * 0.2);
      ctx.lineTo(-csz * 0.5, csz * 0.15); ctx.lineTo(0, -csz * 0.7);
      ctx.lineTo(csz * 0.5, csz * 0.15); ctx.lineTo(csz, -csz * 0.2);
      ctx.lineTo(csz, csz * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,50,50,${0.85 + cpulse * 0.15})`;
      ctx.beginPath(); ctx.arc(0, csz * 0.1, csz * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

export function renderGame(ctx, engine, layout) {
  const { gCell, boardX, boardY, canvasW, canvasH } = layout;
  if (!gCell) return; // layout not ready

  // Clear
  ctx.fillStyle = rgb('BG');
  ctx.fillRect(0, 0, canvasW, canvasH);

  // If game hasn't been initialized yet, just show background + FX
  if (!engine.food) {
    // If there's a replay, render it as background
    if (engine.replayActive) {
      const frame = engine.updateReplay(1 / 60);
      if (frame) {
        renderSnapshot(ctx, frame, layout, 0.35, engine.gTime);
      }
    }
    renderFX(ctx, engine, 0, 0, gCell);
    return;
  }

  const boardW = gCell * COLS, boardH = gCell * ROWS;
  const ox = boardX + (engine.shakeX * (gCell / 12)) | 0;
  const oy = boardY + (engine.shakeY * (gCell / 12)) | 0;

  // If dead and replay is active, render only the replay (not the frozen game)
  if (engine.died && engine.replayActive) {
    const frame = engine.updateReplay(1 / 60);
    if (frame) {
      renderSnapshot(ctx, frame, layout, 0.35, engine.gTime);
    }
    renderFX(ctx, engine, boardX, boardY, gCell);
    return;
  }

  ctx.save();
  ctx.translate(ox, oy);

  // Border
  const bp = (Math.sin(engine.gTime * 1.4) + 1) * 0.5;
  ctx.fillStyle = rgbA(brighten(C.BOARD_BOR, bp * 0.25));
  const border = Math.max(2, gCell / 12 | 0);
  ctx.fillRect(-border, -border, boardW + 2 * border, boardH + 2 * border);

  // Board BG
  ctx.fillStyle = rgb('BOARD_BG');
  ctx.fillRect(0, 0, boardW, boardH);

  // Grid
  ctx.strokeStyle = rgb('GRID'); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * gCell, 0); ctx.lineTo(x * gCell, boardH); }
  for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * gCell); ctx.lineTo(boardW, y * gCell); }
  ctx.stroke();

  // Wall events (drawn as death blocks)
  for (const w of engine.wallEvents) {
    if (w.warningSteps > 0) {
      const fl = (Math.sin(engine.gTime * 14) + 1) * 0.5;
      const a = fl * 0.35;
      for (const c of w.cells) {
        ctx.fillStyle = rgbA(C.BLOCK, a);
        ctx.fillRect(c.x * gCell + 1, c.y * gCell + 1, gCell - 2, gCell - 2);
        ctx.strokeStyle = rgbA(C.BLOCK_MARK, a * 0.8);
        ctx.lineWidth = Math.max(1, gCell / 8);
        const m = gCell * 0.25;
        ctx.beginPath();
        ctx.moveTo(c.x * gCell + m, c.y * gCell + m); ctx.lineTo(c.x * gCell + gCell - m, c.y * gCell + gCell - m);
        ctx.moveTo(c.x * gCell + gCell - m, c.y * gCell + m); ctx.lineTo(c.x * gCell + m, c.y * gCell + gCell - m);
        ctx.stroke();
      }
    } else if (w.stepsRemaining > 0) {
      const a = Math.min(1, w.stepsRemaining / 10) * 0.85;
      for (const c of w.cells) {
        ctx.fillStyle = rgbA(C.BLOCK, a);
        ctx.fillRect(c.x * gCell + 1, c.y * gCell + 1, gCell - 2, gCell - 2);
        ctx.strokeStyle = rgbA(C.BLOCK_MARK, a * 0.8);
        ctx.lineWidth = Math.max(1, gCell / 8);
        const m = gCell * 0.25;
        ctx.beginPath();
        ctx.moveTo(c.x * gCell + m, c.y * gCell + m); ctx.lineTo(c.x * gCell + gCell - m, c.y * gCell + gCell - m);
        ctx.moveTo(c.x * gCell + gCell - m, c.y * gCell + m); ctx.lineTo(c.x * gCell + m, c.y * gCell + gCell - m);
        ctx.stroke();
      }
    }
  }

  // Death blocks
  for (let i = 0; i < engine.deathBlocks.length; i++) {
    const b = engine.deathBlocks[i], fl = engine.deathBlockFlash[i] || 0;
    const bx = b.x * gCell + 1, by = b.y * gCell + 1, bw = gCell - 2, bh = gCell - 2;
    // Fill
    ctx.fillStyle = rgb('BLOCK');
    ctx.fillRect(bx, by, bw, bh);
    if (fl > 0) { ctx.fillStyle = rgbA(C.BLOCK_MARK, fl); ctx.fillRect(bx, by, bw, bh); }
    // Outline
    ctx.strokeStyle = rgbA(brighten(C.BLOCK_MARK, 0.3), 0.9);
    ctx.lineWidth = Math.max(1, gCell / 10);
    ctx.strokeRect(bx, by, bw, bh);
    // Bright X
    ctx.strokeStyle = rgbA(brighten(C.BLOCK_MARK, 0.5), 1.0);
    ctx.lineWidth = Math.max(2, gCell / 6);
    const m = gCell * 0.25;
    ctx.beginPath();
    ctx.moveTo(b.x * gCell + m, b.y * gCell + m); ctx.lineTo(b.x * gCell + gCell - m, b.y * gCell + gCell - m);
    ctx.moveTo(b.x * gCell + gCell - m, b.y * gCell + m); ctx.lineTo(b.x * gCell + m, b.y * gCell + gCell - m);
    ctx.stroke();
  }

  // Portal connecting lines
  const gScale = gCell / 20;
  const linePx = Math.max(2, Math.round(5 * gScale));
  for (const pp of engine.portalPairs) {
    const t = Math.min(1, (engine.gTime - pp.spawnTime) / 0.8);
    const ax = pp.a.x * gCell + gCell / 2, ay = pp.a.y * gCell + gCell / 2;
    const bx = pp.b.x * gCell + gCell / 2, by = pp.b.y * gCell + gCell / 2;
    const eax = ax + (bx - ax) * t * 0.5, eay = ay + (by - ay) * t * 0.5;
    const ebx = bx + (ax - bx) * t * 0.5, eby = by + (ay - by) * t * 0.5;
    ctx.strokeStyle = rgbA(pp.color, 0.62);
    ctx.lineWidth = linePx;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(eax, eay);
    ctx.moveTo(bx, by); ctx.lineTo(ebx, eby);
    ctx.stroke();
  }

  // Portal rings
  for (const pp of engine.portalPairs) {
    const drawPortal = (cell) => {
      const cx = cell.x * gCell + gCell / 2, cy = cell.y * gCell + gCell / 2;
      const maxR = gCell * 0.47;
      const pulse = (Math.sin(engine.gTime * 3.5) + 1) * 0.5;
      const lw = Math.max(2, gCell / 7);
      const [pr, pg, pb] = pp.color;
      for (let ring = 0; ring < 4; ring++) {
        const r = maxR * (1 - ring / 4);
        const bright = ring % 2 === 0;
        const a = bright ? 0.95 - ring * 0.10 : 0.55 - ring * 0.05;
        const fac = bright ? 1 : 0.6;
        const rc = Math.min(255, pr * fac + pulse * 40) | 0;
        const gc = Math.min(255, pg * fac + pulse * 20) | 0;
        const bc = Math.min(255, pb * fac + pulse * 40) | 0;
        ctx.strokeStyle = `rgba(${rc},${gc},${bc},${a})`;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${Math.min(255, pr + 100)},${Math.min(255, pg + 100)},${Math.min(255, pb + 100)},${0.5 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(cx, cy, lw, 0, Math.PI * 2); ctx.fill();
    };
    drawPortal(pp.a); drawPortal(pp.b);
  }

  // Tunnel powerups
  for (const tp of engine.tunnelPowerups) {
    const tBob = Math.sin(engine.gTime * 2.8 + tp.x * 1.1 + tp.y * 0.7) * (gCell * 0.105);
    const cx = tp.x * gCell + gCell / 2, cy = tp.y * gCell + gCell / 2 + tBob;
    const age = engine.gTime - (tp.spawnTime || 0);
    const spawnT = Math.min(age / 0.6, 1);
    const spawnSc = 3 - 2 * spawnT;
    const pulse = (Math.sin(engine.gTime * 3.5 + tp.x * 0.7 + tp.y * 1.3) + 1) * 0.5;
    const baseR = (gCell / 2 - 2) * spawnSc;
    const ringR = baseR * (0.9 + pulse * 0.1);
    const lw = Math.max(2, gCell / 7);
    // Dark fill matching phase color
    ctx.fillStyle = rgbA(darken(C.PHASE_HEAD, 0.8), 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.fill();
    // Bright ring
    ctx.strokeStyle = rgbA(C.PHASE_HEAD, 0.8 + pulse * 0.2);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
  }

  // Halo powerups
  for (const hp of engine.haloPowerups) {
    const hBob = Math.sin(engine.gTime * 2.8 + hp.x * 0.9 + hp.y * 1.3) * (gCell * 0.105);
    const cx = hp.x * gCell + gCell / 2, cy = hp.y * gCell + gCell / 2 + hBob;
    const pulse = (Math.sin(engine.gTime * 3.5 + hp.x * 1.1 + hp.y * 0.9) + 1) * 0.5;
    const spin = engine.gTime * 1.2;
    ctx.fillStyle = 'rgba(40,32,0,0.85)';
    ctx.fillRect(hp.x * gCell + 2, hp.y * gCell + 2 + hBob, gCell - 4, gCell - 4);
    const r1 = (gCell / 2 - 2) * (0.95 + 0.05 * pulse);
    const lw = Math.max(1, gCell / 12);
    ctx.lineWidth = lw;
    ctx.strokeStyle = `rgba(255,210,40,${0.6 + pulse * 0.35})`;
    ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,230,120,${0.3 + pulse * 0.15})`;
    ctx.lineWidth = Math.max(1, gCell / 16);
    ctx.beginPath(); ctx.arc(cx, cy, r1 - Math.max(1, gCell / 14), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,220,80,${0.45 + pulse * 0.25})`;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, r1 * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,240,160,${0.28 + pulse * 0.22})`;
    ctx.beginPath(); ctx.arc(cx, cy, r1 * 0.36, 0, Math.PI * 2); ctx.fill();
    for (let g = 0; g < 4; g++) {
      const ang = spin + g * Math.PI / 2;
      ctx.fillStyle = 'rgba(255,255,200,0.8)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, Math.max(1, gCell / 10), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crown pickups
  for (const cp of engine.crownPickups) {
    const cBob = Math.sin(engine.gTime * 2.8 + cp.x * 0.8 + cp.y * 1.1) * (gCell * 0.105);
    const age = engine.gTime - (cp.spawnTime || 0);
    const spawnT = Math.min(age / 0.6, 1);
    const spawnSc = 3 - 2 * spawnT;
    const pulse = (Math.sin(engine.gTime * 3.5 + cp.x + cp.y) + 1) * 0.5;
    const cx = cp.x * gCell + gCell / 2, cy = cp.y * gCell + gCell / 2 + cBob;
    const sz = (gCell * 0.36) * spawnSc;
    // Crown shape: 3 pointed crown
    ctx.fillStyle = `rgba(255,215,0,${0.85 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy + sz * 0.5);
    ctx.lineTo(cx - sz, cy - sz * 0.2);
    ctx.lineTo(cx - sz * 0.5, cy + sz * 0.15);
    ctx.lineTo(cx, cy - sz * 0.7);
    ctx.lineTo(cx + sz * 0.5, cy + sz * 0.15);
    ctx.lineTo(cx + sz, cy - sz * 0.2);
    ctx.lineTo(cx + sz, cy + sz * 0.5);
    ctx.closePath();
    ctx.fill();
    // Gems
    ctx.fillStyle = `rgba(255,50,50,${0.8 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(cx, cy + sz * 0.1, sz * 0.15, 0, Math.PI * 2); ctx.fill();
  }

  // Food
  {
    const age = engine.gTime - engine.foodSpawnTime;
    const t = Math.min(age / 0.6, 1);
    const sc = 3 - 2 * t;
    const bob = Math.sin(engine.gTime * 2.8) * (gCell * 0.105) * t;
    const pulse = Math.sin(engine.gTime * 4.2) * 0.10 * t;
    const r = Math.max(1, (gCell * sc * 0.5 - gCell * 0.04) * (1 + pulse * 0.3));
    const cx = engine.food.x * gCell + gCell / 2;
    const cy = engine.food.y * gCell + gCell / 2 + bob;
    ctx.fillStyle = rgb('FOOD');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    const shineR = Math.max(1, r * 0.3);
    ctx.fillStyle = 'rgba(255,200,200,0.6)';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, shineR, 0, Math.PI * 2); ctx.fill();
  }

  // Ghost trail
  for (let i = engine.snake.length - 1; i >= 1; i--) {
    if (engine.snakeGhost[i]) {
      ctx.fillStyle = rgbA(C.GHOST, 0.22);
      ctx.fillRect(engine.snake[i].x * gCell + 3, engine.snake[i].y * gCell + 3, gCell - 6, gCell - 6);
    }
  }

  // Snake body
  const bCol = engine.phaseTicks > 0 ? C.PHASE_BODY : C.BODY;
  const edgeW = Math.max(1, Math.round(gCell * 0.12));
  const fadeStart = engine.snake.length - Math.max(1, (engine.snake.length * 0.3) | 0);
  for (let i = engine.snake.length - 1; i >= 1; i--) {
    if (!engine.snakeGhost[i]) {
      let a = i >= fadeStart ? 0.55 + (1 - 0.55) * (1 - (i - fadeStart) / (engine.snake.length - fadeStart)) : 1.0;
      if (engine.phaseTicks > 0) a = Math.min(a, 0.78);
      const sx = engine.snake[i].x * gCell + 2, sy = engine.snake[i].y * gCell + 2;
      const sw = gCell - 4, sh = gCell - 4;
      ctx.fillStyle = rgbA(bCol, a);
      ctx.fillRect(sx, sy, sw, sh);
      // Directional edges
      if (engine.snakeDir[i]) {
        const d = engine.snakeDir[i];           // entry: direction used to reach this cell
        const da = engine.snakeDir[i - 1] || d; // exit: direction of segment toward head
        const isTail = (i === engine.snake.length - 1);
        const isCorner = (d.x !== da.x || d.y !== da.y);
        let top = false, bot = false, lft = false, rgt = false;
        if (!isCorner) {
          // Straight: parallel lines along direction of travel
          if (d.x !== 0) { top = true; bot = true; }
          else            { lft = true; rgt = true; }
          // Tail endcap: extra line opposite direction of travel
          if (isTail) {
            if (d.x === 1)  lft = true;
            if (d.x === -1) rgt = true;
            if (d.y === 1)  top = true;
            if (d.y === -1) bot = true;
          }
        } else {
          // Corner: edges on the outside of the turn
          // Entry from opposite of d, exit toward da
          const eX = -d.x, eY = -d.y; // entry side
          top = (eY !== -1 && da.y !== -1);
          bot = (eY !== 1  && da.y !== 1);
          lft = (eX !== -1 && da.x !== -1);
          rgt = (eX !== 1  && da.x !== 1);
        }
        ctx.fillStyle = `rgba(0,0,0,${0.25 * a})`;
        if (top) ctx.fillRect(sx, sy, sw, edgeW);
        if (bot) ctx.fillRect(sx, sy + sh - edgeW, sw, edgeW);
        if (lft) ctx.fillRect(sx, sy, edgeW, sh);
        if (rgt) ctx.fillRect(sx + sw - edgeW, sy, edgeW, sh);
      }
    }
  }

  // Head
  const hCol = engine.phaseTicks > 0 ? C.PHASE_HEAD : C.HEAD;
  ctx.fillStyle = rgbA(hCol);
  ctx.fillRect(engine.snake[0].x * gCell + 1, engine.snake[0].y * gCell + 1, gCell - 2, gCell - 2);

  // Eyes
  const eOff = Math.round(gCell * 0.22), eSz = Math.max(2, Math.round(gCell * 0.18));
  const px = -engine.dir.y, py = engine.dir.x;
  const ecx = engine.snake[0].x * gCell + gCell / 2, ecy = engine.snake[0].y * gCell + gCell / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(ecx + engine.dir.x * eOff + px * eOff - eSz / 2, ecy + engine.dir.y * eOff + py * eOff - eSz / 2, eSz, eSz);
  ctx.fillRect(ecx + engine.dir.x * eOff - px * eOff - eSz / 2, ecy + engine.dir.y * eOff - py * eOff - eSz / 2, eSz, eSz);

  // Worn crown (rotated to face head)
  if (engine.crown) {
    const crX = engine.snake[0].x + engine.dir.y;
    const crY = engine.snake[0].y - engine.dir.x;
    if (crX >= 0 && crX < COLS && crY >= 0 && crY < ROWS) {
      const ccx = crX * gCell + gCell / 2, ccy = crY * gCell + gCell / 2;
      const csz = gCell * 0.36;
      const cpulse = (Math.sin(engine.gTime * 4) + 1) * 0.5;
      // Rotation: crown points "up" by default; rotate so points face toward head
      // Direction from crown to head is (-dir.y, dir.x)
      const angle = Math.atan2(engine.dir.x, engine.dir.y);
      ctx.save();
      ctx.translate(ccx, ccy);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(255,215,0,${0.9 + cpulse * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(-csz, csz * 0.5);
      ctx.lineTo(-csz, -csz * 0.2);
      ctx.lineTo(-csz * 0.5, csz * 0.15);
      ctx.lineTo(0, -csz * 0.7);
      ctx.lineTo(csz * 0.5, csz * 0.15);
      ctx.lineTo(csz, -csz * 0.2);
      ctx.lineTo(csz, csz * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,50,50,${0.85 + cpulse * 0.15})`;
      ctx.beginPath(); ctx.arc(0, csz * 0.1, csz * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();

  // Particles + float text
  renderFX(ctx, engine, ox, oy, gCell);

  // Countdown
  if (engine.startDelay > 0) {
    const num = Math.ceil(engine.startDelay);
    const pulse = engine.startDelay - Math.floor(engine.startDelay);
    const sz = (48 + pulse * 20) | 0;
    const a = (180 + pulse * 75) | 0;
    ctx.font = `bold ${sz}px monospace`;
    ctx.fillStyle = `rgba(255,255,255,${a / 255})`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), boardX + boardW / 2, boardY + boardH / 2);
  }
}

export function renderFX(ctx, engine, boardOx, boardOy, gCell) {
  for (const p of engine.particles) {
    const t = p.li / p.liMax;
    ctx.fillStyle = rgbA(p.col, t);
    const s = p.sz * t;
    ctx.fillRect(boardOx + p.x * gCell + gCell / 2 - s / 2, boardOy + p.y * gCell + gCell / 2 - s / 2, s, s);
  }
  const fSzBase = Math.max(10, gCell * 0.8) | 0;
  for (const f of engine.floatTexts) {
    const a = Math.min(1, f.li * 2);
    const sc = f.scale || 1;
    ctx.font = `bold ${(fSzBase * sc) | 0}px monospace`;
    ctx.fillStyle = rgbA(f.col, a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(f.text, boardOx + f.x * gCell + gCell / 2, boardOy + f.y * gCell + f.vy * (0.9 - f.li));
  }
}
