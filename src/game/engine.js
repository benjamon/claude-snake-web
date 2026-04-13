import { COLS, ROWS, PORTAL_COLORS, C } from './constants.js';
import {
  sndEat, sndDie, sndVictory, sndPortal,
  sndTunnelPickup, sndTunnelActivate,
  sndHaloPickup, sndHaloSave,
} from './audio.js';

function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

export function createEngine() {
  const engine = {
    // State
    snake: [], snakeGhost: [], dir: { x: 1, y: 0 }, inputQ: [],
    food: null, foodSpawnTime: 0,
    score: 0, tickRate: 0.156, tick: 0, startDelay: 3.0,
    deathBlocks: [], deathBlockFlash: [], tunnelPowerups: [], haloPowerups: [],
    wallEvents: [], portalPairs: [],
    phaseTicks: 0, stepCount: 0, portalCooldown: 0,
    tunnelCharges: 0, haloCharges: 0,
    // FX
    particles: [], floatTexts: [],
    gTime: 0, shakeX: 0, shakeY: 0, shakeMag: 0,
    // Events (set per frame, read by React)
    died: false, newBest: false,

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
        if (!this.cellOccupied(c)) { this.deathBlocks.push(c); this.deathBlockFlash.push(1.0); return; }
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
      const horizontal = Math.random() < 0.5;
      const lineIdx = rnd(0, (horizontal ? ROWS : COLS) - 1);
      this.wallEvents.push({ horizontal, lineIdx, warningSteps: 10, stepsRemaining: -1, cells: [] });
    },

    reset() {
      const mx = COLS / 2 | 0, my = ROWS / 2 | 0;
      this.snake = [{ x: mx + 1, y: my }, { x: mx, y: my }, { x: mx - 1, y: my }];
      this.snakeGhost = [false, false, false];
      this.dir = { x: 1, y: 0 }; this.inputQ = [];
      this.score = 0; this.tick = 0; this.tickRate = 0.156; this.startDelay = 3.0;
      this.deathBlocks = []; this.deathBlockFlash = []; this.tunnelPowerups = []; this.haloPowerups = [];
      this.wallEvents = []; this.portalPairs = [];
      this.phaseTicks = 0; this.stepCount = 0; this.portalCooldown = 0;
      this.tunnelCharges = 0; this.haloCharges = 0;
      this.particles = []; this.floatTexts = []; this.shakeMag = 0;
      this.died = false; this.newBest = false;
      this.spawnPortalPair();
      this.food = this.trySpawnFood(); this.foodSpawnTime = this.gTime;
      this.trySpawn(0, COLS - 1, c => this.tunnelPowerups.push(c));
    },

    queueDirection(d) {
      const last = this.inputQ.length ? this.inputQ[this.inputQ.length - 1] : this.dir;
      if (d.x !== -last.x || d.y !== -last.y) {
        if (d.x !== last.x || d.y !== last.y) {
          if (this.inputQ.length < 3) this.inputQ.push(d);
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
      const SP = 0.5, SZ = 2.0;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (spMin + Math.random() * (spMax - spMin)) * SP;
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push({
          x: cellX, y: cellY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          sz: (szMin + Math.random() * (szMax - szMin)) * SZ,
          li: 0.7, liMax: 0.7, col
        });
      }
    },

    floatText(x, y, text, col) {
      this.floatTexts.push({ x, y, text, col, li: 0.9, vy: -55 });
    },

    updateFX(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        // Exponential drag — particles coast to a stop
        const drag = Math.pow(0.02, dt); // ~98% reduction per second
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

    update(dt) {
      this.gTime += dt;
      this.updateFX(dt);
      this.shakeMag = Math.max(0, this.shakeMag - dt * 80);
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
        if (!dead) for (let i = 0; i < this.snake.length; i++)
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
        dead = false; sndHaloSave(); this.shakeMag = 3;
        this.burst(head.x, head.y, 18, 30, 120, 3, 7, 0.3, 0.7, [[255, 220, 80], [255, 255, 200]]);
      }

      if (dead) {
        this.deathExplosion(); this.shakeMag = 6;
        this.died = true;
        this.newBest = this.score > (parseInt(localStorage.getItem('sn_best') || '0'));
        if (this.newBest) sndVictory(); else sndDie();
        return;
      }

      // Collect powerups
      for (let i = this.tunnelPowerups.length - 1; i >= 0; i--)
        if (this.tunnelPowerups[i].x === head.x && this.tunnelPowerups[i].y === head.y) {
          this.tunnelCharges++; this.tunnelPowerups.splice(i, 1); sndTunnelPickup(); break;
        }
      for (let i = this.haloPowerups.length - 1; i >= 0; i--)
        if (this.haloPowerups[i].x === head.x && this.haloPowerups[i].y === head.y) {
          this.haloCharges++; this.haloPowerups.splice(i, 1); sndHaloPickup(); break;
        }

      const ate = head.x === this.food.x && head.y === this.food.y;
      this.snake.unshift(head); this.snakeGhost.unshift(phasing);

      if (ate) {
        this.foodExplosion(this.food.x, this.food.y);
        const pts = 1 + (this.stepCount / 100 | 0);
        this.floatText(this.food.x, this.food.y, `+${pts}`, C.FOOD);
        if (!phasing) sndEat();
        this.score += pts; this.food = this.trySpawnFood(); this.foodSpawnTime = this.gTime;
        this.tickRate = Math.max(0.055, this.tickRate - 0.0008);
        if (phasing) { this.snake.pop(); this.snakeGhost.pop(); }
      } else { this.snake.pop(); this.snakeGhost.pop(); }

      if (this.phaseTicks > 0) this.phaseTicks--;
      this.stepCount++;

      if (this.stepCount % 50 === 0) this.trySpawnDeathBlock();
      if (this.stepCount % 100 === 0) this.trySpawn(0, COLS - 1, c => this.tunnelPowerups.push(c));
      if (this.stepCount % 200 === 0) this.trySpawn(0, COLS - 1, c => this.haloPowerups.push(c));
      if (this.stepCount > 0 && this.stepCount % 250 === 0) this.spawnPortalPair();
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
