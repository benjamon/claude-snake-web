export default function SideIndicators({ tunnelCharges, haloCharges, phaseTicks, layout }) {
  if (!layout) return null;
  const { boardX, boardY } = layout;
  const leftX = boardX - 4;
  const rightX = boardX + layout.boardW + 4;
  const offsetY = boardY + 60;

  return (
    <>
      {(tunnelCharges > 0 || phaseTicks > 0) && (
        <div
          className="side-indicators side-indicators--left"
          style={{ right: `calc(100% - ${leftX}px)`, top: offsetY }}
        >
          {Array.from({ length: Math.min(tunnelCharges, 10) }).map((_, i) => (
            <div key={i} className="charge-icon charge-icon--tunnel" />
          ))}
          {phaseTicks > 0 && (
            <div className="charge-icon charge-icon--tunnel charge-icon--tunnel-active" />
          )}
        </div>
      )}

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
