import { COLS, ROWS, PORTAL_COLORS, C } from './constants.js';
import {
  sndEat, sndDie, sndVictory, sndPortal,
  sndTunnelPickup, sndTunnelActivate, sndTunnelSpawn,
  sndHaloPickup, sndHaloSave, sndHaloSpawn, sndPortalSpawn,
  sndDeathBlockSpawn, sndWallWarning,
} from './audio.js';

function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

// Deep-copy a snapshot of visual state for replay
function snap(engine) {
  return {
    snake: engine.snake.map(s => ({ ...s })),
    snakeGhost: [...engine.snakeGhost],
    snakeDir: engine.snakeDir.map(d => ({ ...d })),
    dir: { ...engine.dir },
    food: engine.food ? { ...engine.food } : null,
    foodSpawnTime: engine.foodSpawnTime,
    deathBlocks: engine.deathBlocks.map(b => ({ ...b })),
    deathBlockFlash: [...engine.deathBlockFlash],
    tunnelPowerups: engine.tunnelPowerups.map(t => ({ ...t })),
    haloPowerups: engine.haloPowerups.map(h => ({ ...h })),
    wallEvents: engine.wallEvents.map(w => ({
      ...w,
      cells: w.cells.map(c => ({ ...c })),
    })),
    portalPairs: engine.portalPairs.map(pp => ({
      a: { ...pp.a }, b: { ...pp.b },
      color: pp.color, spawnTime: pp.spawnTime,
    })),
    phaseTicks: engine.phaseTicks,
    score: engine.score,
    stepCount: engine.stepCount,
    tunnelCharges: engine.tunnelCharges,
    haloCharges: engine.haloCharges,
    gTime: engine.gTime,
  };
}

export function createEngine() {
  const engine = {
    // State
    snake: [], snakeGhost: [], snakeDir: [], dir: { x: 1, y: 0 }, inputQ: [],
    food: null, foodSpawnTime: 0,
    score: 0, tickRate: 0.187, tick: 0, startDelay: 3.0,
    deathBlocks: [], deathBlockFlash: [], tunnelPowerups: [], haloPowerups: [],
    wallEvents: [], portalPairs: [],
    phaseTicks: 0, stepCount: 0, portalCooldown: 0,
    tunnelCharges: 0, haloCharges: 0,
    // FX
    particles: [], floatTexts: [],
    gTime: 0, shakeX: 0, shakeY: 0, shakeMag: 0,
    // Events (set per frame, read by React)
    died: false, newBest: false,
    // Replay recording
    replayFrames: [],
    replayIndex: 0,
    replayTimer: 0,
    replayActive: false,
    replaySpeed: 1,
    lastReplay: null, // the finished replay for playback

    cellOccupied(c, skipFood = false) {
      for (const s of this.snake) if (s.x === c.x && s.y === c.y) return true;
      if (!skipFood && this.food && this.food.x === c.x && this.food.y === c.y) return true;
      for (const b of this.deathBlocks) if (b.x === c.x && b.y === c.y) return true;
      for (const t of this.tunnelPowerups) if (t.x === c.x && t.y === c.y) return true;
      for (const h of this.haloPowerups) if (h.x === c.x && h.y === c.y) return true;
      for (const pp of this.portalPairs)
        if ((pp.a.x === c.x && pp.a.y === c.y) || (pp.b.x === c.x && pp.b.y === c.y)) return true;
      return false;
    },

    trySpawn(lo, hi, fn) {
      for (let i = 0; i < 300; i++) {
        const c = { x: rnd(lo, hi), y: rnd(lo, hi) };
        if (!this.cellOccupied(c)) { fn(c); return; }
      }
    },

    trySpawnFood() {
      while (true) {
        const c = { x: rnd(0, COLS - 1), y: rnd(0, ROWS - 1) };
        if (!this.cellOccupied(c, true)) return c;
      }
    },

    trySpawnDeathBlock() {
      const head = this.snake[0];
      for (let i = 0; i < 300; i++) {
        const c = { x: rnd(0, COLS - 1), y: rnd(0, ROWS - 1) };
        if (Math.abs(c.x - head.x) + Math.abs(c.y - head.y) < 6) continue;
        if (!this.cellOccupied(c)) {
          // Don't spawn adjacent to any portal
          let nearPortal = false;
          for (const pp of this.portalPairs) {
            for (const p of [pp.a, pp.b]) {
              if (Math.abs(c.x - p.x) <= 1 && Math.abs(c.y - p.y) <= 1) {
                nearPortal = true; break;
              }
            }
            if (nearPortal) break;
          }
          if (nearPortal) continue;
          this.deathBlocks.push(c); this.deathBlockFlash.push(1.0);
          this.shakeMag = Math.max(this.shakeMag, 2);
          sndDeathBlockSpawn();
          return;
        }
      }
    },

    spawnPortalPair() {
      if (this.portalPairs.length >= PORTAL_COLORS.length) return;
      const color = PORTAL_COLORS[this.portalPairs.length];
      for (let ta = 0; ta < 500; ta++) {
        const ca = { x: rnd(1, COLS - 2), y: rnd(1, ROWS - 2) };
        if (this.cellOccupied(ca)) continue;
        for (let tb = 0; tb < 500; tb++) {
          const cb = { x: rnd(1, COLS - 2), y: rnd(1, ROWS - 2) };
          if (Math.abs(cb.x - ca.x) + Math.abs(cb.y - ca.y) < 5) continue;
          if (this.cellOccupied(cb)) continue;
          this.portalPairs.push({ a: ca, b: cb, color, spawnTime: this.gTime });
          this.burst(ca.x, ca.y, 10, 40, 160, 3, 8, 0.3, 0.6, [color, [255, 255, 255]]);
          this.burst(cb.x, cb.y, 10, 40, 160, 3, 8, 0.3, 0.6, [color, [255, 255, 255]]);
          return;
        }
      }
    },

    spawnWall() {
      sndWallWarning();
      const horizontal = Math.random() < 0.5;
      const lineIdx = rnd(0, (horizontal ? ROWS : COLS) - 1);
      this.wallEvents.push({ horizontal, lineIdx, warningSteps: 10, stepsRemaining: -1, cells: [] });
    },

    reset() {
      // Save previous game's replay for death-screen playback
      if (this.replayFrames.length > 0) {
        this.lastReplay = this.replayFrames;
      }
      this.replayFrames = [];
      this.replayIndex = 0;
      this.replayTimer = 0;
      this.replayActive = false;

      const mx = COLS / 2 | 0, my = ROWS / 2 | 0;
      this.snake = [{ x: mx + 1, y: my }, { x: mx, y: my }, { x: mx - 1, y: my }];
      this.snakeGhost = [false, false, false];
      this.snakeDir = [{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }];
      this.dir = { x: 1, y: 0 }; this.inputQ = [];
      this.score = 0; this.tick = 0; this.tickRate = 0.187; this.startDelay = 3.0;
      this.deathBlocks = []; this.deathBlockFlash = []; this.tunnelPowerups = []; this.haloPowerups = [];
      this.wallEvents = []; this.portalPairs = [];
      this.phaseTicks = 0; this.stepCount = 0; this.portalCooldown = 0;
      this.tunnelCharges = 0; this.haloCharges = 0;
      this.particles = []; this.floatTexts = []; this.shakeMag = 0;
      this.died = false; this.newBest = false;
      this.spawnPortalPair();
      this.food = this.trySpawnFood(); this.foodSpawnTime = this.gTime;
      this.trySpawn(0, COLS - 1, c => this.tunnelPowerups.push({ ...c, spawnTime: this.gTime }));
    },

    queueDirection(d) {
      const last = this.inputQ.length ? this.inputQ[this.inputQ.length - 1] : this.dir;
      if (this.portalCooldown > 0) {
        // After portal: allow any direction including reversal
        if (d.x !== last.x || d.y !== last.y) {
          if (this.inputQ.length < 3) this.inputQ.push(d);
        }
      } else {
        if (d.x !== -last.x || d.y !== -last.y) {
          if (d.x !== last.x || d.y !== last.y) {
            if (this.inputQ.length < 3) this.inputQ.push(d);
          }
        }
      }
    },

    activateTunnel() {
      if (this.tunnelCharges > 0 && this.phaseTicks === 0) {
        this.tunnelCharges--;
        this.phaseTicks = 10;
        sndTunnelActivate();
        return true;
      }
      return false;
    },

    // Particle burst (cell-coordinate based for board-relative particles)
    burst(cellX, cellY, count, spMin, spMax, szMin, szMax, liMin, liMax, colors) {
      const SP = 0.25, SZ = 2.0;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (spMin + Math.random() * (spMax - spMin)) * SP;
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push({
          x: cellX, y: cellY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          sz: (szMin + Math.random() * (szMax - szMin)) * SZ,
          li: 1.5, liMax: 1.5, col
        });
      }
    },

    floatText(x, y, text, col, scale = 1, vy = -55) {
      this.floatTexts.push({ x, y, text, col, li: 0.9, vy, scale });
    },

    updateFX(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        // Exponential drag — particles coast to a stop
        const drag = Math.pow(0.005, dt); // heavy drag — particles stop quickly
        p.vx *= drag; p.vy *= drag;
        p.li -= dt;
        if (p.li <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatTexts.length - 1; i >= 0; i--) {
        const f = this.floatTexts[i]; f.y += f.vy * dt; f.li -= dt;
        if (f.li <= 0) this.floatTexts.splice(i, 1);
      }
    },

    deathExplosion() {
      for (const s of this.snake) {
        this.burst(s.x, s.y, 3, 20, 100, 2, 6, 0.2, 0.5,
          [[80, 220, 80], [140, 255, 100], [220, 255, 80], [255, 255, 255]]);
      }
    },

    foodExplosion(cellX, cellY) {
      this.burst(cellX, cellY, 14, 40, 150, 3, 7, 0.25, 0.55, [C.FOOD, [255, 160, 120], [255, 220, 80]]);
    },

    // Start replay playback of the last recorded game
    startReplay() {
      if (!this.lastReplay || this.lastReplay.length === 0) return;
      this.replayActive = true;
      this.replayIndex = 0;
      this.replayTimer = 0;
      // Play back 4x faster than real-time
      this.replaySpeed = 4;
    },

    // Advance replay and return current frame (or null if not replaying)
    updateReplay(dt) {
      if (!this.replayActive || !this.lastReplay) return null;
      this.replayTimer += dt * this.replaySpeed;
      // Each original tick was ~tickRate seconds apart; we stored one frame per tick.
      // Advance at a steady rate regardless of original tick rate.
      const framesPerSec = 20 * this.replaySpeed; // ~20 ticks/sec base
      const targetIdx = Math.floor(this.replayTimer * 20);
      if (targetIdx >= this.lastReplay.length) {
        // Loop
        this.replayTimer = 0;
        this.replayIndex = 0;
        return this.lastReplay[0];
      }
      this.replayIndex = Math.min(targetIdx, this.lastReplay.length - 1);
      return this.lastReplay[this.replayIndex];
    },

    update(dt) {
      this.gTime += dt;
      this.updateFX(dt);
      this.shakeMag = Math.max(0, this.shakeMag - dt * 40);
      this.shakeX = (Math.random() * 2 - 1) * this.shakeMag;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeMag;

      if (this.died) return; // stop game logic after death, but FX above still run

      for (let i = 0; i < this.deathBlockFlash.length; i++)
        this.deathBlockFlash[i] = Math.max(0, this.deathBlockFlash[i] - dt * 3);

      if (this.startDelay > 0) { this.startDelay -= dt; this.tick = 0; return; }
      this.tick += dt;

      if (this.tick >= this.tickRate && this.portalCooldown > 0) {
        this.tick = 0; this.portalCooldown--; return;
      }
      if (this.tick < this.tickRate) return;
      this.tick = 0;

      if (this.inputQ.length) this.dir = this.inputQ.shift();

      let head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
      let phasing = (this.phaseTicks > 0);

      if (phasing) {
        head.x = ((head.x % COLS) + COLS) % COLS;
        head.y = ((head.y % ROWS) + ROWS) % ROWS;
      }

      // Portals
      for (const pp of this.portalPairs) {
        const hitA = head.x === pp.a.x && head.y === pp.a.y;
        const hitB = head.x === pp.b.x && head.y === pp.b.y;
        if (hitA || hitB) {
          const from = hitA ? pp.a : pp.b, to = hitA ? pp.b : pp.a;
          head = { ...to }; this.portalCooldown = 1; sndPortal();
          this.shakeMag = Math.max(this.shakeMag, 4); // portal shake
          for (let s = 0; s <= 12; s++) {
            const t = s / 12;
            this.burst(
              from.x + (to.x - from.x) * t,
              from.y + (to.y - from.y) * t,
              3, 20, 70, 2, 5, 0.25, 0.55, [pp.color, C.PHASE_HEAD]
            );
          }
          break;
        }
      }

      // Death check
      let dead = false;
      if (!phasing) {
        dead = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
        if (!dead) for (let i = 0; i < this.snake.length - 1; i++)
          if (!this.snakeGhost[i] && this.snake[i].x === head.x && this.snake[i].y === head.y) { dead = true; break; }
        if (!dead) for (const b of this.deathBlocks)
          if (b.x === head.x && b.y === head.y) { dead = true; break; }
        if (!dead) for (const w of this.wallEvents)
          if (w.stepsRemaining > 0) for (const c of w.cells)
            if (c.x === head.x && c.y === head.y) { dead = true; break; }
      }

      // Halo save
      if (dead && this.haloCharges > 0) {
        this.haloCharges--; this.phaseTicks = 10; phasing = true;
        head.x = ((head.x % COLS) + COLS) % COLS;
        head.y = ((head.y % ROWS) + ROWS) % ROWS;
        dead = false; sndHaloSave(); this.shakeMag = Math.max(this.shakeMag, 15);
        this.burst(head.x, head.y, 18, 30, 120, 3, 7, 0.3, 0.7, [[255, 220, 80], [255, 255, 200]]);
      }

      if (dead) {
        this.deathExplosion();
        this.shakeMag = 20; // big death shake
        this.died = true;
        this.newBest = this.score > (parseInt(localStorage.getItem('sn_best') || '0'));
        // Record final frame
        this.replayFrames.push(snap(this));
        if (this.newBest) sndVictory(); else sndDie();
        return;
      }

      // Collect powerups
      for (let i = this.tunnelPowerups.length - 1; i >= 0; i--)
        if (this.tunnelPowerups[i].x === head.x && this.tunnelPowerups[i].y === head.y) {
          this.tunnelCharges++;
          this.burst(head.x, head.y, 12, 30, 120, 3, 7, 0.3, 0.6, [C.PHASE_HEAD, [200, 240, 255], [255, 255, 255]]);
          this.shakeMag = Math.max(this.shakeMag, 5);
          this.tunnelPowerups.splice(i, 1); sndTunnelPickup(); break;
        }
      for (let i = this.haloPowerups.length - 1; i >= 0; i--)
        if (this.haloPowerups[i].x === head.x && this.haloPowerups[i].y === head.y) {
          this.haloCharges++;
          this.burst(head.x, head.y, 14, 30, 130, 3, 8, 0.3, 0.7, [[255, 220, 80], [255, 255, 200], [255, 240, 120]]);
          this.shakeMag = Math.max(this.shakeMag, 5);
          this.haloPowerups.splice(i, 1); sndHaloPickup(); break;
        }

      const ate = head.x === this.food.x && head.y === this.food.y;
      this.snake.unshift(head); this.snakeGhost.unshift(phasing); this.snakeDir.unshift({ ...this.dir });

      if (ate) {
        this.foodExplosion(this.food.x, this.food.y);
        const pts = 1 + (this.stepCount / 100 | 0);
        this.floatText(this.food.x, this.food.y, `+${pts}`, C.FOOD, 1.25, -8);
        if (pts > 1) this.floatText(this.food.x, this.food.y - 0.8, `x${pts}`, [255, 220, 80], 1.25, -8);
        if (!phasing) sndEat();
        this.score += pts; this.food = this.trySpawnFood(); this.foodSpawnTime = this.gTime;
        this.tickRate = Math.max(0.066, this.tickRate - 0.0008);
        this.tick = -this.tickRate * 0.5; // half-step pause after eating
        if (phasing) { this.snake.pop(); this.snakeGhost.pop(); this.snakeDir.pop(); }
      } else { this.snake.pop(); this.snakeGhost.pop(); this.snakeDir.pop(); }

      if (this.phaseTicks > 0) this.phaseTicks--;
      this.stepCount++;

      // Record replay frame each tick
      this.replayFrames.push(snap(this));

      if (this.stepCount % 50 === 0) this.trySpawnDeathBlock();
      if (this.stepCount % 100 === 0) this.trySpawn(0, COLS - 1, c => { this.tunnelPowerups.push({ ...c, spawnTime: this.gTime }); sndTunnelSpawn(); });
      if (this.stepCount % 200 === 0) this.trySpawn(0, COLS - 1, c => { this.haloPowerups.push(c); sndHaloSpawn(); });
      if (this.stepCount > 0 && this.stepCount % 250 === 0) { this.spawnPortalPair(); sndPortalSpawn(); }
      if (this.stepCount > 0 && this.stepCount % 300 === 0) this.spawnWall();

      // Wall timers
      for (const w of this.wallEvents) {
        if (w.warningSteps > 0) {
          if (--w.warningSteps === 0) {
            w.stepsRemaining = 50;
            const len = w.horizontal ? COLS : ROWS;
            for (let i = 0; i < len; i++)
              w.cells.push(w.horizontal ? { x: i, y: w.lineIdx } : { x: w.lineIdx, y: i });
          }
        } else if (w.stepsRemaining > 0) w.stepsRemaining--;
      }
    },
  };

  return engine;
}
