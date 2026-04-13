import { useRef, useEffect, useState } from 'react';

export default function HUD({ score, stepCount, personalBest, phaseTicks }) {
  const multiplier = 1 + (stepCount / 100 | 0);
  const prevMultRef = useRef(multiplier);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (multiplier > prevMultRef.current) {
      setBounce(true);
      const id = setTimeout(() => setBounce(false), 300);
      prevMultRef.current = multiplier;
      return () => clearTimeout(id);
    }
    prevMultRef.current = multiplier;
  }, [multiplier]);

  // Scale font size: starts at base, grows with multiplier
  const multScale = Math.min(1 + (multiplier - 2) * 0.08, 2.0);

  return (
    <div className="hud">
      <div className="hud__score">
        SCORE {score}
        {multiplier > 1 && (
          <span
            className={`hud__multiplier${bounce ? ' hud__multiplier--bounce' : ''}`}
            style={{ fontSize: `${multScale}em` }}
          >
            x{multiplier}
          </span>
        )}
      </div>

      <div className="hud__center">
        {phaseTicks > 0 && (
          <span className="hud__tunnel-active">TUNNELING {phaseTicks}</span>
        )}
      </div>

      <div className="hud__best">BEST {personalBest}</div>
    </div>
  );
}
