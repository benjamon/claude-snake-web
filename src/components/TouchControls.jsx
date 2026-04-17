import { useCallback, useRef } from 'react';

const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export default function TouchControls({ onDirection, onTunnel, tunnelCharges, highlightTunnel }) {
  const dpadRef = useRef(null);

  const handleDpadStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = dpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    // Normalize to -1..1 from center
    const nx = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((touch.clientY - rect.top) / rect.height) * 2 - 1;
    // Pick direction based on which axis is dominant
    if (Math.abs(nx) > Math.abs(ny)) {
      onDirection(nx > 0 ? DIRS.right : DIRS.left);
    } else {
      onDirection(ny > 0 ? DIRS.down : DIRS.up);
    }
  }, [onDirection]);

  const handleTunnelStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onTunnel();
  }, [onTunnel]);

  const disabled = !tunnelCharges;
  const iconSize = '28%';

  return (
    <div className="touch-controls">
      <div
        ref={dpadRef}
        className="touch-dpad"
        onTouchStart={handleDpadStart}
        onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
      >
        {/* Arrow icons positioned in the four quadrants */}
        <svg className="touch-dpad__icon touch-dpad__icon--up" viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d="M12 4 L4 18 L20 18 Z" fill="currentColor"/>
        </svg>
        <svg className="touch-dpad__icon touch-dpad__icon--down" viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d="M12 20 L4 6 L20 6 Z" fill="currentColor"/>
        </svg>
        <svg className="touch-dpad__icon touch-dpad__icon--left" viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d="M4 12 L18 4 L18 20 Z" fill="currentColor"/>
        </svg>
        <svg className="touch-dpad__icon touch-dpad__icon--right" viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d="M20 12 L6 4 L6 20 Z" fill="currentColor"/>
        </svg>
        {/* Subtle cross divider */}
        <div className="touch-dpad__cross" />
      </div>
      <button
        className={
          'touch-tunnel-btn' +
          (disabled ? ' touch-tunnel-btn--disabled' : '') +
          (highlightTunnel ? ' touch-tunnel-btn--highlight' : '')
        }
        onTouchStart={disabled ? undefined : handleTunnelStart}
        onPointerDown={(e) => { if (e.pointerType !== 'touch') return; e.preventDefault(); }}
      >
        PHASE
      </button>
    </div>
  );
}
