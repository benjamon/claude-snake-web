export default function SideIndicators({ haloCharges, layout }) {
  if (!layout) return null;
  const rightX = layout.boardX + layout.boardW + 4;
  const offsetY = layout.boardY + 100;

  if (haloCharges <= 0) return null;

  return (
    <div
      className="side-indicators side-indicators--right"
      style={{ left: rightX, top: offsetY }}
    >
      {Array.from({ length: Math.min(haloCharges, 10) }).map((_, i) => (
        <div key={i} className="charge-icon charge-icon--halo" />
      ))}
    </div>
  );
}
