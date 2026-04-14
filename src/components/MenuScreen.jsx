import { useState, useRef, useEffect } from 'react';
import Leaderboard from './Leaderboard.jsx';
import { PALETTES } from '../game/constants.js';

export default function MenuScreen({
  playerName, personalBest, palIdx, leaderboard,
  onPlay, onRename, onPaletteChange, onHelp,
}) {
  const [editing, setEditing] = useState(false);
  const [nameBuf, setNameBuf] = useState(playerName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setNameBuf(playerName);
    setEditing(true);
  }

  function confirmEdit(e) {
    e?.preventDefault();
    const trimmed = nameBuf.trim();
    if (trimmed) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="overlay overlay--dark">
      <div className="overlay__content">
        <h1 className="title">SNAKE</h1>

        <Leaderboard
          scores={leaderboard.scores}
          ready={leaderboard.ready}
          playerName={playerName}
          maxRows={6}
        />

        <div className="text-gold" style={{ fontWeight: 700 }}>
          Personal Best: {personalBest}
        </div>

        {/* Palette selector */}
        <div className="palette-selector">
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => onPaletteChange(-1)}
            aria-label="Previous palette"
          >
            &#9664;
          </button>
          <span className="palette-selector__name">{PALETTES[palIdx].name}</span>
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => onPaletteChange(1)}
            aria-label="Next palette"
          >
            &#9654;
          </button>
        </div>

        {/* Player name */}
        {editing ? (
          <form onSubmit={confirmEdit} style={{ width: '100%', maxWidth: 320, display: 'flex', justifyContent: 'center' }}>
            <input
              ref={inputRef}
              className="input-field"
              type="text"
              maxLength={16}
              value={nameBuf}
              onChange={e => setNameBuf(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={confirmEdit}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          </form>
        ) : (
          <div className="player-info" onClick={startEdit}>
            <span className="player-info__label">Player: {playerName}</span>
            <span className="player-info__edit-hint">tap to rename</span>
          </div>
        )}

        <button className="btn btn--primary btn--full" onClick={onPlay}>
          &#9654;&ensp;PLAY
        </button>

        <div className="btn-row">
          <button className="btn btn--secondary" onClick={startEdit}>Rename</button>
          <button className="btn btn--secondary" onClick={onHelp}>Help</button>
        </div>
      </div>
    </div>
  );
}
