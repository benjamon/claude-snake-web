export default function SideIndicators({ phaseCooldown, phaseTicks, haloCharges, layout }) {
  if (!layout) return null;
  const { boardX, boardY } = layout;
  const leftX = boardX - 4;
  const rightX = boardX + layout.boardW + 4;
  const offsetY = boardY + 100;

  const phaseActive = phaseTicks > 0;
  const phaseReady = !phaseActive && phaseCooldown === 0;

  return (
    <>
      <div
        className="side-indicators side-indicators--left"
        style={{ right: `calc(100% - ${leftX}px)`, top: offsetY }}
      >
        <div
          className={
            'charge-icon charge-icon--tunnel' +
            (phaseActive ? ' charge-icon--tunnel-active' : '') +
            (phaseReady ? '' : ' charge-icon--tunnel-cooldown')
          }
        >
          {!phaseActive && phaseCooldown > 0 && (
            <span className="charge-icon__count">{phaseCooldown}</span>
          )}
        </div>
      </div>

      {haloCharges > 0 && (
        <div
          className="side-indicators side-indicators--right"
          style={{ left: rightX, top: offsetY }}
        >
          {Array.from({ length: Math.min(haloCharges, 10) }).map((_, i) => (
            <div key={i} className="charge-icon charge-icon--halo" />
          ))}
        </div>
      )}
    </>
  );
}
