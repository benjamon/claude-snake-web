import { useRef, useEffect, useCallback } from 'react';
import { COLS, ROWS } from '../game/constants.js';

const SWIPE_MIN = 30;

export default function GameCanvas({ engine, renderer, playing, onSwipe, onLayout }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const swipeRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef({ gCell: 0, boardX: 0, boardY: 0, canvasW: 0, canvasH: 0 });
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;

  const computeLayout = useCallback((w, h) => {
    const margin = Math.round(h * 0.03);
    const gCell = Math.min(
      Math.floor((w - 2 * margin) / COLS),
      Math.floor((h - 2 * margin) / ROWS)
    );
    const boardW = gCell * COLS, boardH = gCell * ROWS;
    const layout = {
      gCell,
      boardX: Math.round((w - boardW) / 2),
      boardY: Math.round((h - boardH) / 2),
      canvasW: w,
      canvasH: h,
      boardW,
      boardH,
    };
    layoutRef.current = layout;
    if (onLayoutRef.current) onLayoutRef.current(layout);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      canvas.width = w;
      canvas.height = h;
      computeLayout(w, h);
    }

    resize();
    window.addEventListener('resize', resize);

    function loop(ts) {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05);
      lastRef.current = ts;
      if (playingRef.current) {
        engine.update(dt);
      } else {
        engine.gTime += dt;
        engine.updateFX(dt);
      }
      renderer(ctx, engine, layoutRef.current);
    }

    rafRef.current = requestAnimationFrame(ts => { lastRef.current = ts; rafRef.current = requestAnimationFrame(loop); });

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [engine, renderer, computeLayout]);

  // Pointer events for swipe
  const handlePointerDown = useCallback((e) => {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const handlePointerUp = useCallback((e) => {
    if (!playingRef.current) return;
    const dx = e.clientX - swipeRef.current.x;
    const dy = e.clientY - swipeRef.current.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > SWIPE_MIN || ay > SWIPE_MIN) {
      let d;
      if (ax > ay) d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      else d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      onSwipeRef.current(d);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  );
}
