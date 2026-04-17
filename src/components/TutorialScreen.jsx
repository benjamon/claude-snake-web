function renderMessage(msg) {
  const parts = msg.split(/\*\*/);
  return parts.map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>));
}

export default function TutorialScreen({
  message, showNext, onNext, nextLabel, onSkip, layout,
}) {
  if (!layout) return null;
  const half = layout.gCell * 0.5;
  const style = {
    left: layout.boardX + half,
    width: layout.boardW - layout.gCell,
    bottom: layout.canvasH - (layout.boardY + layout.boardH) + half,
  };
  return (
    <div className="tutorial-overlay" style={style}>
      <div className="tutorial-message">{renderMessage(message)}</div>
      <div className="tutorial-buttons">
        {showNext && (
          <button className="btn btn--primary" onClick={onNext}>
            {nextLabel || 'Next \u25B6'}
          </button>
        )}
        <button className="btn btn--ghost" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}
