export default function SideIndicators({ tunnelCharges, haloCharges, phaseTicks }) {
  return (
    <>
      {(tunnelCharges > 0 || phaseTicks > 0) && (
        <div className="side-indicators side-indicators--left">
          <span className="indicator-label indicator-label--tunnel">TUNNEL</span>
          {Array.from({ length: Math.min(tunnelCharges, 10) }).map((_, i) => (
            <div key={i} className="charge-icon charge-icon--tunnel" />
          ))}
          {phaseTicks > 0 && (
            <div className="charge-icon charge-icon--tunnel charge-icon--tunnel-active" />
          )}
        </div>
      )}

      {haloCharges > 0 && (
        <div className="side-indicators side-indicators--right">
          <span className="indicator-label indicator-label--halo">HALO</span>
          {Array.from({ length: Math.min(haloCharges, 10) }).map((_, i) => (
            <div key={i} className="charge-icon charge-icon--halo" />
          ))}
        </div>
      )}
    </>
  );
}
