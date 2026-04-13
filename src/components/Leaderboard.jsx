export default function Leaderboard({ scores, ready, playerName, maxRows = 10 }) {
  if (!ready || !scores.length) return null;
  const show = scores.slice(0, maxRows);
  return (
    <div className="leaderboard">
      <div className="leaderboard__title">LEADERBOARD</div>
      {show.map((e, i) => (
        <div
          key={i}
          className={
            'leaderboard__row'
            + (e.name === playerName ? ' leaderboard__row--me' : '')
            + (i === 0 ? ' leaderboard__row--first' : '')
          }
        >
          <span>{i + 1}.</span>
          <span className="leaderboard__name">{e.name}</span>
          <span>{e.score}</span>
        </div>
      ))}
    </div>
  );
}
