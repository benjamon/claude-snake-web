import { useState, useRef, useEffect } from 'react';
import Leaderboard from './Leaderboard.jsx';

export default function DeadScreen({
  score, personalBest, isNewBest, playerName,
  leaderboard, submitFeedback,
  onPlayAgain, onMenu, onRename,
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
    if (trimmed) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div className="overlay overlay--dark">
      <div className="overlay__content">
        <div className="game-over-title">GAME OVER</div>
        <div className="game-over-score">Score: {score}</div>

        {isNewBest && <div className="text-gold text-lg">NEW PERSONAL BEST!</div>}
        {submitFeedback && <div className="text-green text-sm">Score submitted!</div>}

        <Leaderboard
          scores={leaderboard.scores}
          ready={leaderboard.ready}
          playerName={playerName}
          maxRows={5}
        />

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
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
              onBlur={confirmEdit}
              autoComplete="off"
            />
          </form>
        ) : (
          <div className="player-info" onClick={startEdit}>
            <span className="player-info__label">Player: {playerName}</span>
            <span className="player-info__edit-hint">tap to rename</span>
          </div>
        )}

        <button className="btn btn--primary btn--full" onClick={onPlayAgain}>
          &#9654;&ensp;PLAY AGAIN
        </button>

        <div className="btn-row">
          <button className="btn btn--secondary" onClick={onMenu}>Menu</button>
        </div>
      </div>
    </div>
  );
}
