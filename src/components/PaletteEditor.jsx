import { useState, useCallback } from 'react';
import { C, C_KEYS, C_LABELS } from '../game/constants.js';

const CH_NAMES = ['R', 'G', 'B'];

export default function PaletteEditor({ onClose }) {
  const [selectedKey, setSelectedKey] = useState(C_KEYS[0]);
  const [activeCh, setActiveCh] = useState(0);
  const [, forceUpdate] = useState(0);

  const adjust = useCallback((delta) => {
    C[selectedKey][activeCh] = Math.max(0, Math.min(255, C[selectedKey][activeCh] + delta));
    forceUpdate(n => n + 1);
  }, [selectedKey, activeCh]);

  return (
    <div className="palette-editor" onClick={onClose}>
      <div className="palette-panel" onClick={e => e.stopPropagation()}>
        <div className="palette-panel__header">
          <span className="palette-panel__title">PALETTE EDITOR</span>
          <button className="btn btn--danger btn--icon" onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {C_KEYS.map(k => {
            const selected = k === selectedKey;
            const [r, g, b] = C[k];
            return (
              <div
                key={k}
                className={`palette-row${selected ? ' palette-row--selected' : ''}`}
                onClick={() => setSelectedKey(k)}
              >
                <div
                  className="palette-swatch"
                  style={{ background: `rgb(${r},${g},${b})` }}
                />
                <span className="palette-row__label">{C_LABELS[k] || k}</span>
                {selected && (
                  <div className="palette-channels">
                    {[0, 1, 2].map(ch => (
                      <div key={ch} className="palette-channel">
                        <div className="palette-channel__bar">
                          <div
                            className={`palette-channel__fill palette-channel__fill--${CH_NAMES[ch].toLowerCase()}`}
                            style={{ width: `${(C[k][ch] / 255) * 100}%` }}
                          />
                        </div>
                        <span className={`palette-channel__label palette-channel__label--${ch === activeCh ? 'active' : 'inactive'}`}>
                          {CH_NAMES[ch]}:{C[k][ch]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="palette-controls">
          {CH_NAMES.map((ch, i) => (
            <button
              key={ch}
              className={`btn btn--ghost btn--icon${i === activeCh ? ' palette-ch-btn--active' : ''}`}
              onClick={() => setActiveCh(i)}
            >
              {ch}
            </button>
          ))}
          <button className="btn btn--danger btn--icon" onClick={() => adjust(-5)}>&#8722;</button>
          <button className="btn btn--primary btn--icon" onClick={() => adjust(5)}>+</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  );
}
