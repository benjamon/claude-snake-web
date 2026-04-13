import { COLS, ROWS, C, rgb, rgbA, brighten } from './constants.js';

export function renderGame(ctx, engine, layout) {
  const { gCell, boardX, boardY, canvasW, canvasH } = layout;
  if (!gCell) return; // layout not ready

  // Clear
  ctx.fillStyle = rgb('BG');
  ctx.fillRect(0, 0, canvasW, canvasH);

  // If game hasn't been initialized yet, just show background + FX
  if (!engine.food) {
    renderFX(ctx, engine, 0, 0, gCell);
    return;
  }

  const boardW = gCell * COLS, boardH = gCell * ROWS;
  const ox = boardX + (engine.shakeX * (gCell / 20)) | 0;
  const oy = boardY + (engine.shakeY * (gCell / 20)) | 0;

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

  // Wall events
  for (const w of engine.wallEvents) {
    if (w.warningSteps > 0) {
      const fl = (Math.sin(engine.gTime * 14) + 1) * 0.5;
      ctx.fillStyle = rgbA(C.WALL, fl * 0.35);
      if (w.horizontal) ctx.fillRect(0, w.lineIdx * gCell, boardW, gCell);
      else ctx.fillRect(w.lineIdx * gCell, 0, gCell, boardH);
    } else if (w.stepsRemaining > 0) {
      const a = Math.min(1, w.stepsRemaining / 10) * 0.65;
      ctx.fillStyle = rgbA(C.WALL, a);
      if (w.horizontal) ctx.fillRect(0, w.lineIdx * gCell, boardW, gCell);
      else ctx.fillRect(w.lineIdx * gCell, 0, gCell, boardH);
    }
  }

  // Death blocks
  for (let i = 0; i < engine.deathBlocks.length; i++) {
    const b = engine.deathBlocks[i], fl = engine.deathBlockFlash[i] || 0;
    ctx.fillStyle = rgb('BLOCK');
    ctx.fillRect(b.x * gCell + 1, b.y * gCell + 1, gCell - 2, gCell - 2);
    if (fl > 0) { ctx.fillStyle = rgbA(C.BLOCK_MARK, fl); ctx.fillRect(b.x * gCell + 1, b.y * gCell + 1, gCell - 2, gCell - 2); }
    ctx.strokeStyle = rgbA(C.BLOCK_MARK, 0.8);
    ctx.lineWidth = Math.max(1, gCell / 8);
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
    const tx = tp.x * gCell, ty = tp.y * gCell;
    const pulse = (Math.sin(engine.gTime * 5 + tp.x * 0.7 + tp.y * 1.3) + 1) * 0.5;
    const innerR = (gCell / 2 - 5) * (0.75 + pulse * 0.25);
    ctx.fillStyle = rgb('TUNNEL_OUT');
    ctx.fillRect(tx + 2, ty + 2, gCell - 4, gCell - 4);
    ctx.fillStyle = rgbA(C.TUNNEL_OUT, 0.28 + pulse * 0.28);
    ctx.beginPath(); ctx.arc(tx + gCell / 2, ty + gCell / 2, gCell / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb('TUNNEL_IN');
    ctx.beginPath(); ctx.arc(tx + gCell / 2, ty + gCell / 2, innerR, 0, Math.PI * 2); ctx.fill();
  }

  // Halo powerups
  for (const hp of engine.haloPowerups) {
    const cx = hp.x * gCell + gCell / 2, cy = hp.y * gCell + gCell / 2;
    const pulse = (Math.sin(engine.gTime * 3.5 + hp.x * 1.1 + hp.y * 0.9) + 1) * 0.5;
    const spin = engine.gTime * 1.2;
    ctx.fillStyle = 'rgba(40,32,0,0.85)';
    ctx.fillRect(hp.x * gCell + 2, hp.y * gCell + 2, gCell - 4, gCell - 4);
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

  // Food
  {
    const age = engine.gTime - engine.foodSpawnTime;
    const t = Math.min(age / 0.6, 1);
    const sc = 3 - 2 * t;
    const bob = Math.sin(engine.gTime * 2.8) * (gCell * 0.07) * t;
    const pulse = Math.sin(engine.gTime * 4.2) * 0.10 * t;
    const pad = gCell * 0.14 - gCell * 0.10 * pulse;
    const fsz = Math.max(2, gCell * sc - 2 * pad);
    const off = (gCell - gCell * sc) * 0.5;
    ctx.fillStyle = rgb('FOOD');
    ctx.fillRect(engine.food.x * gCell + off + pad, engine.food.y * gCell + off + pad + bob, fsz, fsz);
    const shine = Math.max(2, fsz / 5);
    ctx.fillStyle = 'rgba(255,160,160,0.7)';
    ctx.fillRect(engine.food.x * gCell + off + pad + 2, engine.food.y * gCell + off + pad + 2 + bob, shine, shine);
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
  const fadeStart = engine.snake.length - Math.max(1, (engine.snake.length * 0.3) | 0);
  for (let i = engine.snake.length - 1; i >= 1; i--) {
    if (!engine.snakeGhost[i]) {
      let a = i >= fadeStart ? 0.55 + (1 - 0.55) * (1 - (i - fadeStart) / (engine.snake.length - fadeStart)) : 1.0;
      if (engine.phaseTicks > 0) a = Math.min(a, 0.78);
      ctx.fillStyle = rgbA(bCol, a);
      ctx.fillRect(engine.snake[i].x * gCell + 2, engine.snake[i].y * gCell + 2, gCell - 4, gCell - 4);
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
  const fSz = Math.max(10, gCell * 0.8) | 0;
  for (const f of engine.floatTexts) {
    const a = Math.min(1, f.li * 2);
    ctx.font = `bold ${fSz}px monospace`;
    ctx.fillStyle = rgbA(f.col, a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(f.text, boardOx + f.x * gCell + gCell / 2, boardOy + f.y * gCell + f.vy * (0.9 - f.li));
  }
}
