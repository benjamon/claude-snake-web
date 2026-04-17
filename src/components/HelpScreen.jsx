export default function HelpScreen({ onBack }) {
  return (
    <div className="overlay overlay--dark">
      <div className="overlay__content">
        <h1 className="title" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>HOW TO PLAY</h1>

        <div className="help-section">
          <h2 className="help-heading">Phasing</h2>
          <p className="help-text">
            <b>Space</b> to go ghost for 10 steps. Pass through everything. No growth while active. 20-step cooldown between uses.
          </p>
        </div>

        <div className="help-section">
          <h2 className="help-heading">Halos</h2>
          <p className="help-text">
            Gold pickups = auto-saves. Dying consumes one halo and activates phase instead.
          </p>
        </div>

        <div className="help-section">
          <h2 className="help-heading">Portals</h2>
          <p className="help-text">
            Linked pairs connected by a line. Enter one, exit the other. Free direction change after.
          </p>
        </div>

        <div className="help-section">
          <h2 className="help-heading">Crown</h2>
          <p className="help-text">
            Bonus points every 6 steps. Sits beside your head. Shatters on walls, death blocks, edges, or screen wrap.
          </p>
        </div>

        <div className="help-section">
          <h2 className="help-heading">Scoring</h2>
          <p className="help-text">
            Multiplier grows with time and snake length. Apples score more the longer you survive.
          </p>
        </div>

        <button className="btn btn--primary btn--full" onClick={onBack}>
          &#9664;&ensp;BACK
        </button>
      </div>
    </div>
  );
}
