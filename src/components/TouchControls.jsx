import { useCallback } from 'react';

const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const ARROWS = { up: '\u25B2', down: '\u25BC', left: '\u25C0', right: '\u25B6' };

function DpadButton({ dir, onDir }) {
  const handleStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onDir(DIRS[dir]);
  }, [dir, onDir]);

  return (
    <button
      className={`touch-dpad__btn touch-dpad__btn--${dir}`}
      onTouchStart={handleStart}
      onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
    >
      <svg viewBox="0 0 24 24" width="60%" height="60%">
        {dir === 'up'    && <path d="M12 6 L4 18 L20 18 Z" fill="currentColor"/>}
        {dir === 'down'  && <path d="M12 18 L4 6 L20 6 Z" fill="currentColor"/>}
        {dir === 'left'  && <path d="M6 12 L18 4 L18 20 Z" fill="currentColor"/>}
        {dir === 'right' && <path d="M18 12 L6 4 L6 20 Z" fill="currentColor"/>}
      </svg>
    </button>
  );
}

export default function TouchControls({ onDirection, onTunnel, tunnelCharges }) {
  const handleTunnelStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onTunnel();
  }, [onTunnel]);

  const disabled = !tunnelCharges;

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <DpadButton dir="up" onDir={onDirection} />
        <DpadButton dir="left" onDir={onDirection} />
        <div className="touch-dpad__center" />
        <DpadButton dir="right" onDir={onDirection} />
        <DpadButton dir="down" onDir={onDirection} />
      </div>
      <button
        className={`touch-tunnel-btn${disabled ? ' touch-tunnel-btn--disabled' : ''}`}
        onTouchStart={disabled ? undefined : handleTunnelStart}
        onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
      >
        PHASE
      </button>
    </div>
  );
}
