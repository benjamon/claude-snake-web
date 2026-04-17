import { COLS, ROWS, PORTAL_COLORS, C } from './constants.js';
import {
  sndEat, sndDie, sndVictory, sndPortal,
  sndTunnelPickup, sndTunnelActivate, sndTunnelSpawn,
  sndHaloPickup, sndHaloSave, sndHaloSpawn, sndPortalSpawn,
  sndDeathBlockSpawn, sndWallWarning, sndDeathHit, sndDeathFinale, sndCrownShatter,
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
    crownPickups: engine.crownPickups.map(c => ({ ...c })),
    crown: engine.crown,
    crownApplesEaten: engine.crownApplesEaten,
    crownFreezeTicks: engine.crownFreezeTicks,
    crownUpgradeStartTime: engine.crownUpgradeStartTime,
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
    wallEvents: [], portalPairs: [], crownPickups: [],
    crown: null, // null = none, 1 = single, 2 = double
    crownApplesEaten: 0, crownFreezeTicks: 0, crownUpgradeStartTime: -1,
    phaseTicks: 0, stepCount: 0, portalCooldown: 0,
    tunnelCharges: 0, haloCharges: 0,
    // FX
    particles: [], floatTexts: [],
    gTime: 0, shakeX: 0, shakeY: 0, shakeMag: 0, deathExplosionPending: false,
    deathExplosionQueue: null, // { cells, elapsed, nextIdx }
    portalTrail: null, // { from, to, color, elapsed, duration }
    // Events (set per frame, read by React)
    died: false, newBest: false, deathScreenReady: 0,
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
      for (const cr of this.crownPickups) if (cr.x === c.x && cr.y === c.y) return true;
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
        if (this.cellOccupied(c, true)) continue;
        // Don't spawn on active or warning wall cells
        let onWall = false;
        for (const w of this.wallEvents) {
          if (w.stepsRemaining === 0) continue; // expired
          for (const wc of w.cells)
            if (wc.x === c.x && wc.y === c.y) { onWall = true; break; }
          if (onWall) break;
        }
        if (!onWall) return c;
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
          if (Math.abs(cb.x - ca.x) + Math.abs(cb.y - ca.y) < 6) continue;
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
      // Pre-compute cells, skipping any that overlap portals, powerups, or food
      const cells = [];
      const len = horizontal ? COLS : ROWS;
      for (let i = 0; i < len; i++) {
        const c = horizontal ? { x: i, y: lineIdx } : { x: lineIdx, y: i };
        let skip = false;
        if (this.food && this.food.x === c.x && this.food.y === c.y) skip = true;
        for (const pp of this.portalPairs)
          if ((pp.a.x === c.x && pp.a.y === c.y) || (pp.b.x === c.x && pp.b.y === c.y)) { skip = true; break; }
        for (const t of this.tunnelPowerups)
          if (t.x === c.x && t.y === c.y) { skip = true; break; }
        for (const h of this.haloPowerups)
          if (h.x === c.x && h.y === c.y) { skip = true; break; }
        if (!skip) cells.push(c);
      }
      this.wallEvents.push({ horizontal, lineIdx, warningSteps: 10, stepsRemaining: -1, cells });
    },

    reset() {
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
      this.wallEvents = []; this.portalPairs = []; this.crownPickups = [];
      this.crown = null;
      this.crownApplesEaten = 0; this.crownFreezeTicks = 0; this.crownUpgradeStartTime = -1;
      this.phaseTicks = 0; this.stepCount = 0; this.portalCooldown = 0;
      this.tunnelCharges = 0; this.haloCharges = 0;
      this.particles = []; this.floatTexts = []; this.shakeMag = 0; this.portalTrail = null;
      this.died = false; this.newBest = false; this.deathExplosionPending = false;
      this.deathExplosionQueue = null; this.deathScreenReady = 0;
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

    // Long-lived particle burst (3x normal lifetime) — used for crown upgrades
    burstLong(cellX, cellY, count, spMin, spMax, szMin, szMax, colors) {
      const SP = 0.25, SZ = 2.0;
      const life = 4.5;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (spMin + Math.random() * (spMax - spMin)) * SP;
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push({
          x: cellX, y: cellY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          sz: (szMin + Math.random() * (szMax - szMin)) * SZ,
          li: life, liMax: life, col
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
      // Staggered death explosion
      if (this.deathExplosionQueue) {
        const q = this.deathExplosionQueue;
        q.elapsed += dt;
        if (!q.finaleSpawned) {
          const targetIdx = Math.floor(q.elapsed / 0.08);
          while (q.nextIdx <= targetIdx && q.nextIdx < q.cells.length) {
            const s = q.cells[q.nextIdx];
            this.burst(s.x, s.y, 15, 20, 100, 2, 6, 0.2, 0.5,
              [[80, 220, 80], [140, 255, 100], [220, 255, 80], [255, 255, 255]]);
            if (q.nextIdx % 3 === 0) sndDeathHit();
            q.nextIdx++;
          }
          if (q.nextIdx >= q.cells.length) {
            // Big finale: burst on every snake block simultaneously
            for (const s of q.cells) {
              this.burst(s.x, s.y, 7, 30, 140, 3, 8, 0.3, 0.7,
                [[80, 220, 80], [140, 255, 100], [220, 255, 80], [255, 255, 255]]);
            }
            sndDeathFinale();
            this.shakeMag = Math.max(this.shakeMag, 12);
            q.finaleSpawned = true;
            q.finaleTime = this.gTime;
          }
        } else if (this.gTime >= q.finaleTime + 1.0) {
          this.deathExplosionQueue = null;
          this.deathScreenReady = this.gTime;
        }
      }
      // Staggered portal trail
      if (this.portalTrail) {
        const tr = this.portalTrail;
        tr.elapsed += dt;
        const progress = Math.min(tr.elapsed / tr.duration, 1);
        const targetBursts = Math.floor(progress * tr.totalBursts);
        while (tr.emitted <= targetBursts && tr.emitted < tr.totalBursts) {
          const t = tr.emitted / (tr.totalBursts - 1);
          this.burst(
            tr.from.x + (tr.to.x - tr.from.x) * t,
            tr.from.y + (tr.to.y - tr.from.y) * t,
            3, 20, 70, 2, 5, 0.25, 0.55, [tr.color, tr.headColor]
          );
          tr.emitted++;
        }
        if (tr.emitted >= tr.totalBursts) this.portalTrail = null;
      }
    },

    deathExplosion() {
      // Queue staggered explosions from head to tail
      this.deathExplosionQueue = {
        cells: this.snake.map(s => ({ x: s.x, y: s.y })),
        elapsed: 0, nextIdx: 0, finaleSpawned: false, finaleTime: 0,
      };
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
    },

    // Advance replay and return current frame (or null if not replaying)
    updateReplay(dt) {
      if (!this.replayActive || !this.lastReplay) return null;
      this.replayTimer += dt;
      // Each frame was recorded once per game tick (~5-8 ticks/sec).
      // Use 6 frames/sec for approximately 1x playback speed.
      const targetIdx = Math.floor(this.replayTimer * 6);
      if (targetIdx >= this.lastReplay.length) {
        const overTime = (targetIdx - this.lastReplay.length) / 6;
        if (overTime >= 1.0) {
          this.replayTimer = 0;
          this.replayIndex = 0;
          return this.lastReplay[0];
        }
        return this.lastReplay[this.lastReplay.length - 1];
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

      // Fire death particles once shake subsides
      if (this.deathExplosionPending && this.shakeMag <= 0.5) {
        this.deathExplosionPending = false;
        this.deathExplosion();
      }

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

      // Crown upgrade freeze: skip game logic for a few ticks while the
      // double-crown scaling animation plays
      if (this.crownFreezeTicks > 0) { this.crownFreezeTicks--; return; }

      if (this.inputQ.length) this.dir = this.inputQ.shift();

      let head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
      let phasing = (this.phaseTicks > 0);

      let wrapped = false;
      if (phasing) {
        const wx = ((head.x % COLS) + COLS) % COLS;
        const wy = ((head.y % ROWS) + ROWS) % ROWS;
        if (wx !== head.x || wy !== head.y) wrapped = true;
        head.x = wx; head.y = wy;
      }

      // Portals
      for (const pp of this.portalPairs) {
        const hitA = head.x === pp.a.x && head.y === pp.a.y;
        const hitB = head.x === pp.b.x && head.y === pp.b.y;
        if (hitA || hitB) {
          const from = hitA ? pp.a : pp.b, to = hitA ? pp.b : pp.a;
          const hCol = this.phaseTicks > 0 ? C.PHASE_HEAD : C.HEAD;
          head = { ...to }; this.portalCooldown = 1; sndPortal();
          this.shakeMag = Math.max(this.shakeMag, 4); // portal shake
          // Stagger particle trail over the cooldown period
          this.portalTrail = {
            from, to, color: pp.color, headColor: hCol,
            elapsed: 0, duration: this.tickRate,
            emitted: 0, totalBursts: 13,
          };
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
        this.shakeMag = 20; // big death shake
        this.deathExplosionPending = true;
        this.died = true;
        this.newBest = this.score > (parseInt(localStorage.getItem('sn_best') || '0'));
        // Record final frame and save replay
        this.replayFrames.push(snap(this));
        this.lastReplay = this.replayFrames;
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

      // Collect crown pickups
      for (let i = this.crownPickups.length - 1; i >= 0; i--)
        if (this.crownPickups[i].x === head.x && this.crownPickups[i].y === head.y) {
          if (!this.crown) { this.crown = 1; this.crownApplesEaten = 0; }
          const base = 1 + (this.stepCount / 240 | 0) + (this.snake.length / 10 | 0);
          const mult = this.crown;
          const pts = base * mult;
          this.score += pts;
          const label = mult > 1 ? `+${base} x ${mult}` : `+${base}`;
          this.floatText(head.x, head.y, label, [255, 215, 0], 1.25 + 0.5 * (mult - 1), -8);
          this.burst(head.x, head.y, 14, 30, 130, 3, 8, 0.3, 0.7, [[255, 215, 0], [255, 255, 150], [200, 160, 0]]);
          this.shakeMag = Math.max(this.shakeMag, 5);
          this.crownPickups.splice(i, 1); sndHaloPickup(); break;
        }

      // Crown: award periodic points and check if destroyed
      if (this.crown) {
        const crownCell = { x: head.x + this.dir.y, y: head.y - this.dir.x };
        let crownDead = wrapped;
        if (!crownDead) crownDead = crownCell.x < 0 || crownCell.x >= COLS || crownCell.y < 0 || crownCell.y >= ROWS;
        if (!crownDead) for (const b of this.deathBlocks)
          if (b.x === crownCell.x && b.y === crownCell.y) { crownDead = true; break; }
        if (!crownDead) for (const w of this.wallEvents)
          if (w.stepsRemaining > 0) for (const c of w.cells)
            if (c.x === crownCell.x && c.y === crownCell.y) { crownDead = true; break; }
        if (crownDead) {
          this.crown = null;
          this.crownApplesEaten = 0;
          const oob = wrapped || crownCell.x < 0 || crownCell.x >= COLS || crownCell.y < 0 || crownCell.y >= ROWS;
          this.burst(oob ? head.x : crownCell.x, oob ? head.y : crownCell.y,
            16, 20, 80, 2, 5, 0.2, 0.5, [[255, 215, 0], [200, 160, 0]]);
          sndCrownShatter();
        } else if (this.stepCount % 6 === 0) {
          const base = 1 + (this.stepCount / 240 | 0) + (this.snake.length / 10 | 0);
          const mult = this.crown;
          const pts = base * mult;
          this.score += pts;
          const label = mult > 1 ? `+${base} x ${mult}` : `+${base}`;
          this.floatText(crownCell.x, crownCell.y, label, [255, 215, 0], 0.8 + 0.5 * (mult - 1), -6);
        }
      }

      const ate = head.x === this.food.x && head.y === this.food.y;
      this.snake.unshift(head); this.snakeGhost.unshift(phasing); this.snakeDir.unshift({ ...this.dir });

      if (ate) {
        this.foodExplosion(this.food.x, this.food.y);
        const pts = 1 + (this.stepCount / 240 | 0) + (this.snake.length / 10 | 0);
        this.floatText(this.food.x, this.food.y, `+${pts}`, C.FOOD, 1.25, -8);
        sndEat();
        this.score += pts; this.food = this.trySpawnFood(); this.foodSpawnTime = this.gTime;
        this.tickRate = Math.max(0.066, this.tickRate - 0.0008);
        this.tick = -this.tickRate * 0.5; // half-step pause after eating
        if (phasing) { this.snake.pop(); this.snakeGhost.pop(); this.snakeDir.pop(); }

        // Every third apple while crowned adds another crown
        if (this.crown) {
          this.crownApplesEaten++;
          if (this.crownApplesEaten % 3 === 0) {
            this.crown++;
            this.crownFreezeTicks = 3;
            this.crownUpgradeStartTime = this.gTime;
            const crownCell = { x: head.x + this.dir.y, y: head.y - this.dir.x };
            this.burstLong(crownCell.x, crownCell.y, 30, 20, 120, 3, 8,
              [[255, 215, 0], [255, 235, 120], [255, 255, 200], [220, 170, 20]]);
            this.shakeMag = Math.max(this.shakeMag, 8);
            this.floatText(crownCell.x, crownCell.y, `x${this.crown}`,
              [255, 215, 0], 1.5 + 0.5 * (this.crown - 1), -10);
            sndHaloPickup();
          }
        }
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
      if (this.stepCount > 0 && this.stepCount % 225 === 0) this.trySpawn(1, COLS - 2, c => this.crownPickups.push({ ...c, spawnTime: this.gTime }));

      // Wall timers
      for (const w of this.wallEvents) {
        if (w.warningSteps > 0) {
          if (--w.warningSteps === 0) {
            w.stepsRemaining = 48;
          }
        } else if (w.stepsRemaining > 0) w.stepsRemaining--;
      }
    },
  };

  return engine;
}
