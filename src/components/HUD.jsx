export default function HUD({ score, stepCount, personalBest, tunnelCharges, phaseTicks, onTunnel }) {
  const multiplier = 1 + (stepCount / 100 | 0);

  return (
    <div className="hud">
      <div className="hud__score">
        SCORE {score}
        {multiplier > 1 && <span className="hud__multiplier">x{multiplier}</span>}
      </div>

      <div className="hud__center">
        {phaseTicks > 0 ? (
          <span className="hud__tunnel-active">TUNNELING {phaseTicks}</span>
        ) : tunnelCharges > 0 ? (
          <button className="hud__tunnel-btn" onClick={onTunnel}>
            TUNNEL
          </button>
        ) : null}
      </div>

      <div className="hud__best">BEST {personalBest}</div>
    </div>
  );
}
