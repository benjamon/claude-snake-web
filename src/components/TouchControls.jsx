import { useCallback, useRef } from 'react';

const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function DpadButton({ dir, label, style, onDir }) {
  const handleStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onDir(DIRS[dir]);
  }, [dir, onDir]);

  return (
    <button
      className={`touch-dpad__btn touch-dpad__btn--${dir}`}
      style={style}
      onTouchStart={handleStart}
      onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ onDirection, onTunnel }) {
  const tunnelRef = useRef(null);

  const handleTunnelStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onTunnel();
  }, [onTunnel]);

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <DpadButton dir="up" label="\u25B2" onDir={onDirection} />
        <DpadButton dir="left" label="\u25C0" onDir={onDirection} />
        <div className="touch-dpad__center" />
        <DpadButton dir="right" label="\u25B6" onDir={onDirection} />
        <DpadButton dir="down" label="\u25BC" onDir={onDirection} />
      </div>
      <button
        ref={tunnelRef}
        className="touch-tunnel-btn"
        onTouchStart={handleTunnelStart}
        onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
      >
        PHASE
      </button>
    </div>
  );
}
